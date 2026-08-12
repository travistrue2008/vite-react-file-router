/**
 * Types for the virtual routes module.
 *
 * Reference this from the app's env declarations:
 *   /// <reference path="./plugin/client.d.ts" />
 *
 * Once the plugin ships as a package this becomes:
 *   /// <reference types="@travistrue2008/vite-react-file-router/client" />
 */
declare module 'virtual:file-router/routes.jsx' {
  import type { createBrowserRouter } from 'react-router'

  const router: ReturnType<typeof createBrowserRouter>

  export default router
}
