/**
 * The recovery path, driven through a real chokidar watcher.
 *
 * Reproduces the sequence a developer actually types: create a directory, add a
 * Page that isn't valid yet, then finish writing it.
 *
 * The fixture lives in the repo rather than a temp directory so bare specifiers
 * like `react-router` resolve when the virtual module is loaded.
 */
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { createServer, type ViteDevServer } from 'vite'
import fileRouter, { VIRTUAL_ROUTES_ID } from '../../../src/plugin/index.ts'

const root = fileURLToPath(new URL('.', import.meta.url))
const appDir = join(root, 'src/components/app')
const uploadsDir = join(appDir, 'uploads')
const uploadsPage = join(uploadsDir, 'Page.tsx')
const routesFile = join(root, 'src/routes.jsx')

let server: ViteDevServer

beforeAll(async () => {
  rmSync(uploadsDir, {
    recursive: true,
    force: true,
  })

  server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    // outputPath is the optional debug artifact; asserting on it here also
    // proves it tracks the virtual module rather than drifting from it.
    plugins: [fileRouter({ outputPath: 'src/routes.jsx' }), react()],
    server: { middlewareMode: true },
  })
})

afterAll(async () => {
  await server?.close()

  rmSync(uploadsDir, {
    recursive: true,
    force: true,
  })

  rmSync(routesFile, { force: true })
})

/** Waits for the debounced regeneration to settle, or gives up. */
async function waitFor (predicate: () => boolean, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (predicate()) return true
    await Bun.sleep(50)
  }

  return predicate()
}

const routes = () => readFileSync(routesFile, 'utf8')
const routesContain = (text: string) => () => routes().includes(text)

test('a new directory with no Page keeps the last good routes', async () => {
  const before = routes()

  mkdirSync(uploadsDir, { recursive: true })

  await Bun.sleep(600)

  expect(routes()).toBe(before)
})

test('a Page with no default export still leaves them in place', async () => {
  const before = routes()

  writeFileSync(uploadsPage, 'export const Uploads = () => null\n')

  await Bun.sleep(600)

  expect(routes()).toBe(before)
})

// The regression: only a `change` event fires here, so the plugin used to sit
// on the stale error and never pick the fix up.
test('adding the default export back regenerates the routes', async () => {
  writeFileSync(
    uploadsPage,
    'export default function Page() { return <div>Uploads</div> }\n',
  )

  expect(await waitFor(routesContain('Uploads_Page'))).toBe(true)

  expect(routes()).toContain(
    "import Uploads_Page from './components/app/uploads/Page'",
  )

  expect(routes()).toContain("path: 'uploads',")
})

// The debug file is written from the same tree, but the virtual module is what
// the app actually imports — so it has to have picked the new route up too.
test('the virtual module reflects the same change', async () => {
  const module = await server.ssrLoadModule(VIRTUAL_ROUTES_ID)

  const paths = module.default.routes[0].children.map(
    (child: { path?: string }) => child.path,
  )

  expect(paths).toContain('uploads')
})

test('breaking the default export again keeps the routes', async () => {
  const before = routes()

  writeFileSync(uploadsPage, 'export default 42\n')

  await Bun.sleep(600)

  expect(routes()).toBe(before)
})

test('removing the directory drops the route', async () => {
  rmSync(uploadsDir, {
    recursive: true,
    force: true,
  })

  expect(await waitFor(() => !routesContain('Uploads_Page')())).toBe(true)
})
