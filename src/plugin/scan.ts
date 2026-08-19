import { readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { readMetaExports, type RouteMeta } from './meta.ts'

/** Component file extensions, in resolution-priority order. */
const COMPONENT_EXTENSIONS = ['tsx', 'jsx'] as const

/** `meta` is plain module code and never contains JSX. */
const META_EXTENSIONS = ['ts', 'js'] as const

export type RouteNode = {
  /** Directory name verbatim, e.g. `users` or `$userId`. Empty for the root. */
  segment: string
  /** Directory path relative to `inputPath`, split into segments. */
  segments: string[]
  /** Absolute path to the directory. */
  dirPath: string
  /** Absolute path to `Page.{tsx,jsx}`, if present. */
  page?: string
  /** Absolute path to `Layout.{tsx,jsx}`, if present. */
  layout?: string
  /** `meta.{ts,js}` and the route properties it contributes, if present. */
  meta?: RouteMeta
  children: RouteNode[]
}

export type RouteTree = {
  root: RouteNode
  /** Absolute path to the app's own `404.{tsx,jsx}`, if it defines one. */
  notFound?: string
}

/**
 * Resolves `<dir>/<base>.<ext>` over `extensions` in priority order. Warns when
 * more than one exists, since only the first can ever be used.
 */
function resolveFile (
  dirPath: string,
  base: string,
  extensions: readonly string[],
): string | undefined {
  const found = extensions
    .map((ext) => join(dirPath, `${base}.${ext}`))
    .filter((candidate) => existsSync(candidate))

  if (found.length > 1) {
    console.warn(
      `[vite-react-file-router] ${found[1]} is shadowed by ${found[0]} ` +
        'and will be ignored',
    )
  }

  return found[0]
}

/** Resolves `Page` / `Layout` / `404`, preferring `.tsx`. */
function resolveComponent (dirPath: string, base: string): string | undefined {
  return resolveFile(dirPath, base, COMPONENT_EXTENSIONS)
}

/**
 * Resolves the directory's `meta` module and reads its named exports. Which of
 * them exist decides what the generator emits, not merely whether the file is
 * valid, so the parse belongs to the scan rather than to validation.
 */
function resolveMeta (dirPath: string): RouteMeta | undefined {
  const path = resolveFile(dirPath, 'meta', META_EXTENSIONS)

  if (!path) return undefined

  return {
    path,
    exports: readMetaExports(path),
  }
}

function scanDirectory (
  dirPath: string,
  segments: string[],
  segment: string,
): RouteNode {
  const children = readdirSync(dirPath, { withFileTypes: true })
    // Only directories define route segments; files never do.
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map(
      (name) => scanDirectory(join(dirPath, name), [...segments, name], name),
    )

  return {
    segment,
    segments,
    dirPath,
    page: resolveComponent(dirPath, 'Page'),
    layout: resolveComponent(dirPath, 'Layout'),
    meta: resolveMeta(dirPath),
    children,
  }
}

/**
 * Walks `inputDir` into a route tree. Throws if the directory doesn't exist.
 */
export function scan (inputDir: string): RouteTree {
  if (!existsSync(inputDir) || !statSync(inputDir).isDirectory()) {
    throw new Error(
      `[vite-react-file-router] inputPath does not exist: ${inputDir}`,
    )
  }

  return {
    root: scanDirectory(inputDir, [], ''),
    // The app's 404 lives at the root of inputPath and is not itself a route.
    notFound: resolveComponent(inputDir, '404'),
  }
}

/** Depth-first walk in the same order the generated imports are emitted. */
export function walk (node: RouteNode): RouteNode[] {
  return [node, ...node.children.flatMap(walk)]
}

export type { MetaExports, RouteMeta } from './meta.ts'
