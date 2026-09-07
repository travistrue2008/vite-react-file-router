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

/**
 * Renders and navigates with `console.error` muted. Every case here throws on
 * purpose, and React logs a full stack trace for each error a boundary catches
 * — pages of noise carrying no signal, since the assertions are what prove the
 * boundary ran.
 */
async function renderAt (path: string) {
  const log = console.error

  console.error = () => {}

  try {
    render(<RouterProvider router={router} />)

    await act(async () => {
      await router.navigate(path)
    })
  } finally {
    console.error = log
  }
}

test('a boundary catches a throw from its own loader', async () => {
  await renderAt('/orders')

  expect(screen.getByText('Orders boundary: loader exploded')).toBeTruthy()
})

// The boundary sits on the `users` route, so it covers a nested route that
// declares none of its own — this is what the placement decision buys.
test('a nested render error bubbles to the nearest boundary', async () => {
  await renderAt('/users/123')

  expect(screen.getByText('Users boundary: render exploded')).toBeTruthy()
})

test('an error under a boundary-less directory reaches the root', async () => {
  await renderAt('/uploads')

  expect(screen.getByText('Root boundary: uploads exploded')).toBeTruthy()
})

// A thrown Response is not an Error: react-router turns it into an
// ErrorResponse carrying a status, with no `message` at all. It reaches the
// boundary by the same bubbling path.
test('a thrown Response bubbles as an ErrorResponse', async () => {
  await renderAt('/missing')

  expect(screen.getByText('Root boundary: 404 Not Found')).toBeTruthy()
})

test('a JSON-bodied Response has its body parsed into data', async () => {
  await renderAt('/teapot')

  expect(screen.getByText('Teapot boundary: 418 no coffee')).toBeTruthy()
})

test('a route that does not throw renders normally', async () => {
  await renderAt('/users')

  expect(screen.getByText('Users Index')).toBeTruthy()
})

test('the boundary lands on the route, never on its index child', async () => {
  const routes = await loadRoutes(server)

  const users = routes[0].children.find(
    (child: { path?: string }) => child.path === 'users',
  )

  const index = users.children.find((child: { index?: boolean }) => child.index)

  expect(users.errorElement).toBeTruthy()
  expect(index.errorElement).toBeUndefined()
})

test('a directory with no Error file gets no errorElement', async () => {
  const routes = await loadRoutes(server)

  const uploads = routes[0].children.find(
    (child: { path?: string }) => child.path === 'uploads',
  )

  expect(uploads.errorElement).toBeUndefined()
  expect(routes[0].errorElement).toBeTruthy()
})
