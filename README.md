# react-router-file-router

A React 19 + `react-router` app built with [Vite](https://vite.dev), using [Bun](https://bun.com) as the package manager and script runner.

To install dependencies:

```bash
bun install
```

To start a development server at http://localhost:5173:

```bash
bun dev
```

To build for production (static output to `dist/`) and preview it:

```bash
bun run build
bun run preview
```

To run tests:

```bash
bun test
```

To typecheck:

```bash
bun run typecheck
```

The app imports its router from the virtual module `virtual:file-router/routes.jsx`.
To read the generated routes, `vite.config.ts` also sets `outputPath`, which makes
`dev` and `build` write the same config to `src/routes.jsx` as a debug artifact —
importing that file directly works and stays in sync, but the virtual module is the
supported entry point.

## Routing

Route components live under `src/components/app`, where each sub-directory is a URL segment and directories named `:param` are dynamic segments:

| Path                                       | URL Route          |
| ------------------------------------------ | ------------------ |
| `src/components/app`                       | `/`                |
| `src/components/app/photos`                | `/photos`          |
| `src/components/app/photos/:photoId`       | `/photos/123`      |
| `src/components/app/users`                 | `/users`           |
| `src/components/app/users/:userId`         | `/users/456`       |

Each directory may contain a `Page.tsx` (rendered when its route matches) and an optional `Layout.tsx` (must render an `<Outlet />`). `src/components/app/404.tsx` handles unmatched routes.

The `createBrowserRouter` config is **generated** from this directory tree by the Vite plugin in `src/plugin`, so the file structure is the single source of truth. The plugin writes `src/routes.jsx` at server start and rewrites it whenever a directory or component file is added or removed. Two rules it enforces:

- A directory with **no sub-directories** must contain a `Page` — otherwise it is a route that can never render anything, and the plugin fails the build naming the directory.
- A directory that **has** sub-directories but no `Page` renders the 404 at its own path.

See `.claude/file-router.md` for the full specification and `src/plugin/index.ts` for the options (`inputPath`, `outputPath`).
