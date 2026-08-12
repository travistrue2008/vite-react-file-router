import react from '@vitejs/plugin-react'
import { createServer, type ViteDevServer } from 'vite'
import fileRouter, {
  type FileRouterOptions,
  VIRTUAL_ROUTES_ID,
} from '../../src/plugin/index.ts'

/**
 * Boots a real Vite dev server over a fixture app with the plugin installed,
 * exactly as a consuming project would configure it.
 */
export function startServer(
  root: string,
  options: FileRouterOptions = {},
): Promise<ViteDevServer> {
  return createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [fileRouter(options), react()],
    server: { middlewareMode: true, watch: null },
  })
}

/** Loads the virtual routes module the app would import. */
export async function loadRouter(server: ViteDevServer) {
  const module = await server.ssrLoadModule(VIRTUAL_ROUTES_ID)

  return module.default
}
