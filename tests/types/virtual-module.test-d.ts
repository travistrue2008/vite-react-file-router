// Type-level only. Named `.test-d.ts` so `bun test` skips it (its glob wants
// `.test.ts`) while `bun run typecheck` still checks it — the declaration has
// to stay a non-empty tuple for consumers that demand one, notably
// storybook-addon-remix-react-router's `routing` parameter.
import type { RouteObject } from 'react-router'
import routes from 'virtual:file-router/routes.jsx'

const _nonEmpty: [RouteObject, ...RouteObject[]] = routes
const _array: RouteObject[] = routes

export { _array, _nonEmpty }
