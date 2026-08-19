/**
 * Rolldown AST plumbing, shared by the `default`-export checks in validate.ts
 * and the `meta` named-export reader in meta.ts.
 */
import { readFileSync } from 'node:fs'
import { parseSync } from 'rolldown/experimental'

// rolldown exports no node type for the AST `parseSync` returns. Every read
// below is guarded on `type` first, so a structural alias is the honest shape —
// `unknown` would only add a cast at each of those reads.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Node = Record<string, any>

/**
 * Parses a module and returns its top-level statements. The path goes through
 * verbatim so rolldown picks the dialect from the extension.
 */
export function parseModule (filePath: string): Node[] {
  const source = readFileSync(filePath, 'utf8')
  const { program, errors } = parseSync(filePath, source)

  if (errors.length > 0) {
    throw new Error(
      `[vite-react-file-router] failed to parse ${filePath}: ` +
        `${errors[0]?.message ?? 'unknown error'}`,
    )
  }

  return program.body as Node[]
}

/** An export specifier's public name; a string-literal name carries `value`. */
export function exportedName (specifier: Node): string | undefined {
  return specifier.exported?.name ?? specifier.exported?.value
}
