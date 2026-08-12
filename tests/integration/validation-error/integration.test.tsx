import { afterEach, expect, test } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRouter, startServer } from '../server'

const root = fileURLToPath(new URL('.', import.meta.url))
const ordersDir = join(root, 'src/components/app/orders/:orderId')

afterEach(() => {
  rmSync(join(root, 'src/components/app/orders'), {
    recursive: true,
    force: true,
  })
})

// Created here rather than checked in, because git cannot track an empty
// directory — which is exactly the shape being tested.
test('a Page-less leaf directory fails the dev server at startup', async () => {
  mkdirSync(ordersDir, { recursive: true })

  const promise = startServer(root)

  await expect(promise).rejects.toThrow(
    '[Error] src/components/app/orders/:orderId: Page.{jsx|tsx} not found',
  )

  // Never reached a served request — the failure is at startup, not on import.
  await promise.then((server) => server.close()).catch(() => {})
})

// Loads the virtual module rather than the `outputPath` debug artifact: this
// server is started without an `outputPath`, so no file is written, and
// `routes.jsx` is gitignored anyway — reading one would only ever find a stale
// leftover from a previous run.
test('the same tree starts cleanly once the Page exists', async () => {
  const server = await startServer(root)

  await expect(loadRouter(server)).resolves.toBeDefined()
  await server.close()
})
