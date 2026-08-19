/**
 * Types for the virtual routes module.
 *
 * Consumers reference this by package:
 *   /// <reference types="vite-react-file-router/client" />
 *
 * This repo consumes the plugin from source rather than from node_modules, so
 * it references the file directly instead:
 *   /// <reference path="./plugin/client.d.ts" />
 */
declare module 'virtual:file-router/routes.jsx' {
  import type { RouteObject } from 'react-router'

  const routes: [RouteObject, ...RouteObject[]]

  export default routes
}
