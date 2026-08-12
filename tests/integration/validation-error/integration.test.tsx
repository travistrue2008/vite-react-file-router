import { afterEach, expect, test } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startServer } from '../server'

const root = fileURLToPath(new URL('.', import.meta.url))
const ordersDir = join(root, 'src/components/app/orders/:orderId')

afterEach(() => {
  rmSync(join(root, 'src/components/app/orders'), { recursive: true, force: true })
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

test('the same tree starts cleanly once the Page exists', async () => {
  const server = await startServer(root)

  await expect(server.ssrLoadModule('/src/routes.jsx')).resolves.toBeDefined()
  await server.close()
})
