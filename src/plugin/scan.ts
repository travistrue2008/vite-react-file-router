import { readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Component file extensions, in resolution-priority order. */
const EXTENSIONS = ['tsx', 'jsx'] as const

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
  children: RouteNode[]
}

export type RouteTree = {
  root: RouteNode
  /** Absolute path to the app's own `404.{tsx,jsx}`, if it defines one. */
  notFound?: string
}

/**
 * Resolves `<dir>/<base>.{tsx,jsx}`, preferring `.tsx`. Warns when both exist,
 * since only one of them can ever render.
 */
function resolveComponent (dirPath: string, base: string): string | undefined {
  const found = EXTENSIONS.map((ext) => join(dirPath, `${base}.${ext}`)).filter(
    (candidate) => existsSync(candidate),
  )

  if (found.length > 1) {
    console.warn(
      `[vite-react-file-router] ${found[1]} is shadowed by ${found[0]} ` +
        'and will be ignored',
    )
  }

  return found[0]
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
