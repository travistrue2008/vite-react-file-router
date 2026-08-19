import { fileURLToPath } from 'node:url'
import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { act, cleanup, render, screen } from '@testing-library/react'
import { RouterProvider, type createBrowserRouter } from 'react-router'
import { loadRouter, loadRoutes, startServer } from '../server'

import type { ViteDevServer } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))

let server: ViteDevServer
let router: ReturnType<typeof createBrowserRouter>

beforeAll(async () => {
  server = await startServer(root)
  router = await loadRouter(server)
})

// Testing Library's auto-cleanup doesn't hook into bun:test.
afterEach(cleanup)

afterAll(async () => {
  await server?.close()
})

async function renderAt (path: string) {
  render(<RouterProvider router={router} />)

  await act(async () => {
    await router.navigate(path)
  })
}

test("the meta module's loader feeds its own Layout", async () => {
  await renderAt('/users')

  expect(screen.getByText('Loaded: Ada')).toBeTruthy()
  expect(screen.getByText('Users Index')).toBeTruthy()
})

// The metadata sits on the `users` route rather than on the index child, so a
// nested match runs the loader too — this is the whole point of that placement.
test('a nested route still runs the parent loader', async () => {
  await renderAt('/users/123')

  expect(screen.getByText('Loaded: Ada')).toBeTruthy()
  expect(screen.getByText('User 123 of Ada')).toBeTruthy()
})

test('the exported id is what useRouteLoaderData resolves', async () => {
  const routes = await loadRoutes(server)

  const users = routes[0].children.find(
    (child: { path?: string }) => child.path === 'users',
  )

  expect(users.id).toBe('users')
  expect(typeof users.loader).toBe('function')
})

test('the index child carries neither', async () => {
  const routes = await loadRoutes(server)

  const users = routes[0].children.find(
    (child: { path?: string }) => child.path === 'users',
  )

  const index = users.children.find((child: { index?: boolean }) => child.index)

  expect(index.id).toBeUndefined()
  expect(index.loader).toBeUndefined()
})
