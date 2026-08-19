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

test('the module default-exports the route config', async () => {
  const routes = await loadRoutes(server)

  expect(routes).toHaveLength(1)
  expect(routes[0].path).toBe('/')

  const paths = routes[0].children.map(
    (child: { path?: string }) => child.path,
  )

  expect(paths).toContain('users')
})
