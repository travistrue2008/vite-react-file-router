import react from '@vitejs/plugin-react'
import fileRouter, { VIRTUAL_ROUTES_ID } from '../../src/plugin/index.ts'
import { createBrowserRouter } from 'react-router'
import { createServer } from 'vite'

import type { ViteDevServer } from 'vite'
import type { FileRouterOptions } from '../../src/plugin/index.ts'

/**
 * Boots a real Vite dev server over a fixture app with the plugin installed,
 * exactly as a consuming project would configure it.
 */
export function startServer (
  root: string,
  options: FileRouterOptions = {},
): Promise<ViteDevServer> {
  return createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [fileRouter(options), react()],
    server: {
      middlewareMode: true,
      watch: null,
    },
  })
}

/** The route config the app would import from the virtual module. */
export async function loadRoutes (server: ViteDevServer) {
  const module = await server.ssrLoadModule(VIRTUAL_ROUTES_ID)

  return module.default
}

/** ...and the browser router a consuming app would build from it. */
export async function loadRouter (server: ViteDevServer) {
  return createBrowserRouter(await loadRoutes(server))
}
