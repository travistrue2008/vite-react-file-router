# vite-react-file-router

A Vite plugin that generates a configured instance of [`react-router`](https://reactrouter.com)'s _Browser Router_ from your project's component directory tree, making the file structure is the single source of truth for your app's routes.

```
src/components/app/                  →  /
src/components/app/users/            →  /users
src/components/app/users/$userId/    →  /users/123
```

The plugin lives in [`src/plugin`](src/plugin). The rest of the repo is a small React app that uses it, plus the test suite.

---

## Installation

```bash
# with bun.sh
bunx install-peerdeps react-router
bun add vite-react-file-router
```

```bash
# with npm
npx install-peerdeps react-router
npm install vite-react-file-router
```


---

## Usage

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import fileRouter from 'vite-react-file-router'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    fileRouter(),
    react(),
  ],
})
```

```tsx
// src/components/App.tsx
import routes from 'virtual:file-router/routes.jsx'
import { createBrowserRouter, RouterProvider } from 'react-router'

const router = createBrowserRouter(routes)

export default function App() {
  return <RouterProvider router={router} />
}
```

The virtual module default-exports the route config for your app to pass into appropriate router factory function. See [Router compatibility](#router-compatibility). Build it once at module scope; rebuilding it per render resets router state.

TypeScript needs to know about the virtual module. Reference the shipped declaration once:

```ts
// src/vite-env.d.ts
/// <reference types="vite/client" />
/// <reference types="vite-react-file-router/client" />
```

### Options

| Option | Default | Description |
| --- | --- | --- |
| `inputPath` | `src/components/app` | Route components directory, relative to the Vite root. |
| `outputPath` | *(none)* | Optional debug artifact — writes the same routes to disk so you can read them. See [Debugging](#debugging). |

Both are relative to the Vite root. `outputPath` may not resolve inside `inputPath`; the plugin throws if it does, since writing into the watched tree would make it retrigger itself.

---

## Routing rules

**Only directories create route segments.** as files never do.

For example, a directory named `users` produces the `/users` segment, and `photos/gallery.tsx` produces nothing.

**A directory starting with `$` is a dynamic segment.** `users/$userId/` becomes `/users/:userId`,
readable in the component with `useParams()`.

Directories can be named using the following naming conventions:

- `kebab-case`
- `snake_case`
- `camelCase`
- `PascalCase`

However, but keep in mind that directory names all normalize the same way, meaning that a naming collision will occur if multiple sibling directories use the same identifier name in different naming conventions.

For example:

- `src/components/app/blog/last-week/Page.tsx` (`blog/last-week`)
- `src/components/app/blog/LastWeek/Page.tsx` (`blog/LastWeek`)

Both directory names are unique, and they even result in different routes, however, this will still result in a build error because both directories get resolved to the same identifier under-the-hood.

**Each route directory may contain:**

| File | Role |
| --- | --- |
| `Page.{tsx,jsx}` | Rendered when that route matches exactly. |
| `Layout.{tsx,jsx}` | Wraps the segment and everything beneath it. Must render an `<Outlet />`. |
| `meta.{ts,js}` | Optional `id` and `loader` for the route. See [Route metadata](#route-metadata). |

`Page` and `Layout` must have a `default` export that is a React component. If both `Page.tsx` and `Page.jsx` exist, `.tsx` wins and the plugin warns — the same goes for `meta.ts` over `meta.js`. Any other file in the directory is ignored, so co-locating styles, helpers, and tests is fine.

### Matched Directories

The table below explains the result of what happens when a route is matched to a file directory:

| Has Sub-Directories | Has `Page` Compnoent | Result             |
| ------------------- | -------------------- | ------------------ |
| Yes                 | Yes                  | Fenders the `Page` |
| Yes                 | No                   | Fenders the 404    |
| No                  | Yes                  | Fenders the `Page` |
| No                  | No                   | **Build error**    |

A leaf directory with no `Page` is a route that can never render anything, so a build error is thrown instead. Directories with _only_ a `Layout` component are therefore legal only when they have sub-directories.

A directory in the middle of the tree is different: `users/` may legitimately exist only to host
`users/$userId/`. Navigating to `/users` then renders the 404.

That per-directory 404 is not redundant with the catch-all. `/users` matches the `users` route, which outranks the root's `*`, so matching stops there — and with no index child react-router renders an empty `<Outlet />`. You would get a blank page, not a 404.

### 404 handling

Define `404.{tsx,jsx}` at the root of `inputPath` and it is used everywhere a 404 is rendered. Without one, the plugin supplies its own. It is not a route and does not satisfy the leaf rule.

### Route metadata

A route directory may hold a `meta.{ts,js}` module with two optional named exports:

| Export | Effect |
| --- | --- |
| `id` | Becomes the route object's `id`, which is what `useRouteLoaderData(id)` takes. |
| `loader` | Becomes the route object's `loader`. |

```ts
// src/components/app/users/meta.ts
export const id = 'users'

export async function loader () {
  return { count: await countUsers() }
}
```

```jsx
import * as Users_Meta from './components/app/users/meta'

// …
      {
        id: Users_Meta.id,
        path: 'users',
        loader: Users_Meta.loader,
        element: <Users_Layout />,
        children: [
          {
            index: true,
            element: <Users_Page />,
          },
        ],
      },
```

Each export is emitted only when it actually exists, and a `meta` module exporting _neither_ results in a build error.

Loaders are applied to the directory's own route, and all sub-routes. For example: say that an application defines these routes:

- `/users`
- `/users/:userId`

If a loader is defined a meta file in the `src/components/app/users` directory, then the loader will run for both routes. If a `Layout` file is defined in that same directory, then its exported component can read that data with `useLoaderData()`, however a `Page` component must read the data with `useRouteLoaderData(id)`.

---

## Generated output

For this repo's own tree:

```
src/components/app/
├── 404.tsx
├── Layout.tsx
├── Page.tsx
├── users/
│   ├── Layout.tsx
│   ├── Page.tsx
│   └── $userId/
│       ├── Layout.tsx
│       └── Page.tsx
```

```jsx
// AUTO-GENERATED by vite-react-file-router. Do not edit — changes will be overwritten.
import NotFoundPage from './components/app/404'
import Layout from './components/app/Layout'
import Page from './components/app/Page'
import Users_Layout from './components/app/users/Layout'
import Users_Page from './components/app/users/Page'
import Users__UserId_Layout from './components/app/users/$userId/Layout'
import Users__UserId_Page from './components/app/users/$userId/Page'

export default [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Page />,
      },
      {
        path: 'users',
        element: <Users_Layout />,
        children: [
          {
            index: true,
            element: <Users_Page />,
          },
          {
            path: ':userId',
            element: <Users__UserId_Layout />,
            children: [
              {
                index: true,
                element: <Users__UserId_Page />,
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]
```

Every node gets an index child, which is what makes a `Page`-less directory render the 404 instead of nothing.

---

## Examples

```ts
import routes from 'virtual:file-router/routes.jsx'

createBrowserRouter(routes)
createHashRouter(routes)
createMemoryRouter(routes, { initialEntries: ['/users/123'] })
createStaticHandler(routes)
createStaticRouter(routes, context)
```

`useRoutes(routes)` and `matchRoutes(routes, location)` accept it too.

### Testing With Storybook

The config drops straight into [`storybook-addon-remix-react-router`](https://github.com/JesusTheHun/storybook-addon-remix-react-router), so stories navigate through your real route tree:

```ts
import routes from 'virtual:file-router/routes.jsx'

import {
  reactRouterParameters,
  withRouter,
} from 'storybook-addon-remix-react-router'


export default {
  decorators: [withRouter],
  parameters: {
    reactRouter: reactRouterParameters({
      routing: routes,
      location: { path: '/users/123' },
    }),
  },
}
```

Use **addon v7** — it peers `storybook@^10` and `react-router@^7.0.2 || ^8.0.0`. Version 6 is also Storybook 10 but caps React Router at `^7.0.2`, so it cannot satisfy this plugin's `react-router@^8` peer.

`routing: routes` mounts the real page tree, which is what you want for navigation stories. An isolated component story still places the story element itself, via the addon's `reactRouterOutlet()` helpers or `useStoryElement: true` on the matching route.

---

## Validation

Everything is checked before a single route is emitted, and **all** failures are reported at once rather than one per run. A broken tree fails `vite build` and fails dev-server startup, so problems surface immediately instead of on whichever request happens to import the routes first.

```
[Error] src/components/app/users/$userId: Page.{jsx|tsx} not found
[Error] src/components/app/users/Page.tsx: has no `default` export
[Error] src/components/app/users/Page.tsx: `default` export is not a valid React component
[Error] duplicate import name `Blog_LastWeek_Page` generated by:
  src/components/app/blog/last-week
  src/components/app/blog/lastWeek
[Error] src/components/app/users/meta.ts: exports neither `id` nor `loader`
```

Default exports are validated by parsing, never by evaluating your modules. Functions, classes,
arrow functions, `memo(...)`, `forwardRef(...)`, `lazy(...)`, and identifiers bound to any of those
are accepted; so is an identifier bound to an import, since what it points at can't be known
statically.

A `meta` module's named exports are found the same way — by parsing, in every form `export` takes,
including `export { fetchAll as loader }` and `export { loader } from './loader'`. A bare
`export * from './shared'` is assumed to provide both, on the same reasoning: what it re-exports
can't be known statically, and an `id` or `loader` that turns out undefined is treated by
`react-router` exactly as absent.

---

## Dev server behavior

Adding, removing, or renaming anything under `inputPath` regenerates the routes and reloads. Editing the *contents* of a `Page`, `Layout`, or `404` re-runs validation. Changing these files' `default` export will also regenerate the routes. Editing any of the named exported in a `meta` module will also rebuild the routes, since its `id` and `loader` exports affects the associated the route object. The routes still only regenerate if they actually changed, so ordinary editing goes through Fast Refresh instead of a page reload. Edits to any other file are ignored entirely. Bursts of events are debounced, so pasting a directory tree is one rebuild.

When validation fails mid-session the dev server **stays up**. The error goes to the console and the browser overlay, the last good routes keep serving, and fixing the problem clears the overlay. That covers the common sequence of creating a directory, adding an empty `Page.tsx`, and then writing the component — each step reports what's still missing without taking the server down.

---

## Debugging

The virtual module has no file you can open, so set `outputPath` to write the same routes to disk:

```ts
fileRouter({ outputPath: 'src/routes.jsx' })
```

The file carries a "do not edit" banner and is regenerated on every change. It is a real, valid module — importing it directly works and stays in sync — but the virtual module is the supported entry point, and the file should be gitignored. The only difference is import specifiers: relative in the file, absolute in the virtual module, which has no directory for a relative path to resolve against.

To see what the dev server is actually serving, request the module by id (this is post-transform, so expect compiled JSX and HMR boilerplate):

```bash
curl 'http://localhost:5173/@id/virtual:file-router/routes.jsx'
```

---

## Working on this repo

Requires [Bun](https://bun.com).

```bash
bun install
bun dev          # http://localhost:5173
bun test
bun run typecheck
bun run lint     # eslint . — `bun run lint:fix` to autofix
bun run build    # the published library
```

Style is enforced entirely by ESLint's core formatting rules — there is no Prettier. `eslint`
stays pinned to `9.20.1` (ESLint 10 removed those rules) and `typescript` to `^5.9.3` (which is
what `typescript-eslint@8` supports); both are dev-only and neither affects the published package.

### Layout

| Path | Contents |
| --- | --- |
| [`src/plugin/`](src/plugin) | The plugin. |
| [`src/components/app/`](src/components/app) | The demo app's route tree. |
| [`tests/unit/`](tests/unit) | Import naming, export validation, watch-event filtering. |
| [`tests/generate/`](tests/generate) | Directory tree → emitted source, over the full case matrix. |
| [`tests/integration/`](tests/integration) | Real Vite dev servers rendering the generated routes. |

Inside the plugin:

| Module | Responsibility |
| --- | --- |
| `index.ts` | Plugin hooks, virtual module, watcher. |
| `scan.ts` | Directory tree → `RouteTree`. |
| `validate.ts` | Leaf-`Page` rule, name collisions, `default` export and `meta` export checks. |
| `naming.ts` | Segment → import identifier. |
| `generate.ts` | `RouteTree` → module source. |
| `parse.ts` | Rolldown AST plumbing shared by `scan` and `validate`. |
| `meta.ts` | `meta.{ts,js}` → the `id` / `loader` a route gets. |
| `404.jsx` | Built-in fallback. |

Generation fixtures are built in temp directories rather than checked in, because several cases hinge on *empty* directories, which git cannot track. Integration fixtures are checked in and live under the repo so bare specifiers like `react-router` resolve.

### Packaging

`bun run build` produces the published library and nothing else:

```bash
bun run build   # tsc -p tsconfig.build.json → dist/, then copies 404.jsx and client.d.ts
```

The demo app has no build. It exists to exercise the plugin under `bun run dev` and is never
distributed, so there is nothing to bundle. A few details of the library build are load-bearing:

- `react`, `react-router`, and `vite` are `peerDependencies`. Neither the plugin nor its generated code imports `react-router` at runtime. The peer merely declares the contract, and `client.d.ts` imports `RouteObject` from it for types. `react` stays a runtime peer because the emitted config contains JSX.
- `404.jsx` ships uncompiled and keeps its name, because `generate.ts` resolves it relative to `import.meta.url` — the same expression has to work from `src/plugin` and from `dist`.
