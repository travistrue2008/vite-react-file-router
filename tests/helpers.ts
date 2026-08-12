import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

export const PAGE_SOURCE =
  'export default function Page() {\n  return null\n}\n'

export const LAYOUT_SOURCE =
  "import { Outlet } from 'react-router'\n\n" +
  'export default function Layout() {\n  return <Outlet />\n}\n'

/**
 * A fixture app tree. Keys are paths relative to `src/components/app`; a key
 * ending in `/` creates an empty directory, which several spec use-cases depend
 * on and which git could not track as a checked-in fixture.
 */
export type Files = Record<string, string> | string[]

function normalize (files: Files): Record<string, string> {
  if (!Array.isArray(files)) return files

  return Object.fromEntries(
    files.map((path) => [
      path,
      path.endsWith('/')
        ? ''
        : path.includes('Layout')
          ? LAYOUT_SOURCE
          : PAGE_SOURCE,
    ]),
  )
}

export type Fixture = {
  /** Project root — the Vite root for this fixture app. */
  root: string
  /** `<root>/src/components/app` */
  inputDir: string
  /** `<root>/src/routes.jsx` */
  outputFile: string
}

/** Materializes a fixture app in a temp directory and removes it afterwards. */
export function withFixture<T> (files: Files, run: (fixture: Fixture) => T): T {
  const root = mkdtempSync(join(tmpdir(), 'file-router-'))
  const inputDir = join(root, 'src', 'components', 'app')

  mkdirSync(inputDir, { recursive: true })

  for (const [path, contents] of Object.entries(normalize(files))) {
    const target = join(inputDir, path)

    if (path.endsWith('/')) {
      mkdirSync(target, { recursive: true })
      continue
    }

    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, contents, 'utf8')
  }

  try {
    return run({
      root,
      inputDir,
      outputFile: join(root, 'src', 'routes.jsx'),
    })
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    })
  }
}

/**
 * Replaces the plugin's own 404 import, whose path is relative to wherever the
 * repo happens to live, with a stable token.
 */
export function stabilize (source: string): string {
  return source.replace(
    /^import NotFoundPage from '.*\/plugin\/404'$/m,
    "import NotFoundPage from '<built-in-404>'",
  )
}
