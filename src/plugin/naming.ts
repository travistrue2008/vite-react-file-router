/**
 * Import-identifier generation.
 *
 * A directory path relative to `inputPath` becomes a PascalCase identifier:
 * segments are individually PascalCased and joined with `_`, and a leading `$`
 * on a dynamic-param segment becomes a leading `_`.
 *
 *   users            -> Users_Page
 *   users/$userId    -> Users__UserId_Page
 *   blog/$last-week  -> Blog__LastWeek_Layout
 *   users (meta.ts)  -> Users_Meta
 *   users (Error)    -> Users_Error
 *   users (404.tsx)  -> Users_NotFound
 */

const SEPARATORS = /[-_\s]+/

/**
 * Splits on separators *and* camelCase boundaries, then capitalizes each part.
 */
export function pascalCase (input: string): string {
  return input
    .split(SEPARATORS)
    .flatMap((part) => part.replace(/([a-z0-9])([A-Z])/g, '$1\0$2').split('\0'))
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('')
}

/** A `$`-prefixed directory is a dynamic route param; the `$` becomes `_`. */
export function isDynamicSegment (segment: string): boolean {
  return segment.startsWith('$')
}

function segmentToIdentifierPart (segment: string): string {
  return isDynamicSegment(segment)
    ? `_${pascalCase(segment.slice(1))}`
    : pascalCase(segment)
}

/**
 * Builds the import name for one of a route directory's files.
 *
 * `segments` is the directory path relative to `inputPath`, so the root route
 * directory passes `[]` and yields a bare `Layout` / `Error` / `Page` /
 * `NotFound` / `Meta`.
 *
 * Two kinds have a suffix their filename doesn't match, for different reasons.
 * `meta.{ts,js}` is lowercase because it holds no component, and a `404` file
 * cannot lend its name to an identifier — it doesn't parse as one.
 */
export function importName (
  segments: readonly string[],
  kind: 'Layout' | 'Error' | 'Page' | 'NotFound' | 'Meta',
): string {
  const prefix = segments.map(segmentToIdentifierPart).join('_')

  return prefix ? `${prefix}_${kind}` : kind
}
