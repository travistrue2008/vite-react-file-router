import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { act, cleanup, render, screen } from '@testing-library/react'
import { fileURLToPath } from 'node:url'
import { RouterProvider, type createBrowserRouter } from 'react-router'
import type { ViteDevServer } from 'vite'
import { loadRouter, startServer } from '../server'

const root = fileURLToPath(new URL('.', import.meta.url))

let server: ViteDevServer
let router: ReturnType<typeof createBrowserRouter>

beforeAll(async () => {
  server = await startServer(root)
  router = await loadRouter(server)
})

// Testing Library's auto-cleanup doesn't hook into bun:test, so mounted trees
// would otherwise pile up in the shared document.
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

test('the app 404 replaces the built-in one', async () => {
  await renderAt('/nonsense')

  expect(screen.getByText('Custom 404')).toBeTruthy()
  expect(screen.queryByText('404 - Not Found')).toBeNull()
})

// `/users` exists as a directory but has no Page. It matches the `users` route,
// which outranks the root splat, so without its own index 404 it would render
// a blank page instead.
test('a Page-less directory renders the 404 rather than nothing', async () => {
  await renderAt('/users')

  expect(screen.getByText('Custom 404')).toBeTruthy()
})

test('the directory below it still resolves', async () => {
  await renderAt('/users/42')

  expect(screen.getByText('User ID: 42')).toBeTruthy()
})

test('a URL below a real route also 404s', async () => {
  await renderAt('/users/42/settings')

  expect(screen.getByText('Custom 404')).toBeTruthy()
})
