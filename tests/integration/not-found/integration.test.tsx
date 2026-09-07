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

test('an unmatched URL renders the root 404', async () => {
  await renderAt('/nonsense')

  expect(screen.getByText('Root 404')).toBeTruthy()
})

// The whole point of resolving 404 per directory: /admin gets its own.
test('a subtree with its own 404 renders that one, not the root', async () => {
  await renderAt('/admin/nonsense')

  expect(screen.getByText('Admin 404')).toBeTruthy()
  expect(screen.queryByText('Root 404')).toBeNull()
})

test('a deeper miss under that subtree still renders its 404', async () => {
  await renderAt('/admin/reports/nonsense/deeper')

  expect(screen.getByText('Admin 404')).toBeTruthy()
})

test('a subtree without its own 404 falls through to the nearest', async () => {
  await renderAt('/blog/nonsense')

  expect(screen.getByText('Root 404')).toBeTruthy()
})

// `/users` exists as a directory but has no Page. It matches the `users` route,
// which outranks the root splat, and a splat never matches an empty remainder —
// so without its index child it would render a blank page.
test('a Page-less directory renders the 404 governing it', async () => {
  await renderAt('/users')

  expect(screen.getByText('Root 404')).toBeTruthy()
})

test('a real route still resolves', async () => {
  await renderAt('/users/42')

  expect(screen.getByText('User ID: 42')).toBeTruthy()
})

test('a URL below a real route also 404s', async () => {
  await renderAt('/users/42/settings')

  expect(screen.getByText('Root 404')).toBeTruthy()
})

// react-router ranks a dynamic segment above a splat, so a single unmatched
// segment is a param, not a miss. Surprising, but it is react-router's rule.
test('a sibling dynamic segment claims one unmatched segment', async () => {
  await renderAt('/users/nope')

  expect(screen.getByText('User ID: nope')).toBeTruthy()
  expect(screen.queryByText('Root 404')).toBeNull()
})
