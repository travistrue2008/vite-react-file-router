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

/** Mounts the generated router and drives it the way a link click would. */
async function renderAt (path: string) {
  render(<RouterProvider router={router} />)

  await act(async () => {
    await router.navigate(path)
  })
}

test('renders the root Page inside the root Layout', async () => {
  await renderAt('/')

  expect(screen.getByText('Root Layout')).toBeTruthy()
  expect(screen.getByText('Home')).toBeTruthy()
})

test('renders a sub-route Page inside both Layouts', async () => {
  await renderAt('/users')

  expect(screen.getByText('Root Layout')).toBeTruthy()
  expect(screen.getByText('Users Layout')).toBeTruthy()
  expect(screen.getByText('Users Index')).toBeTruthy()
})

test('resolves a dynamic segment into useParams', async () => {
  await renderAt('/users/123')

  expect(screen.getByText('User ID: 123')).toBeTruthy()
  expect(screen.getByText('Users Layout')).toBeTruthy()
})

test('an unmatched URL falls through to the built-in 404', async () => {
  await renderAt('/nonsense')

  expect(screen.getByText('404 - Not Found')).toBeTruthy()
})
