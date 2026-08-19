# react-router-file-router

A **Vite plugin** that generates a `react-router` `createBrowserRouter()` config from a component
directory tree, so the file structure is the single source of truth for the app's routes. It will
eventually ship as its own package, `vite-react-file-router`.

The plugin is `src/plugin/`. Everything else in the repo exists to exercise it: a small demo React
app (`index.html`, `src/main.tsx`, `src/components/`) and the test suite (`tests/`).

Docs: [README.md](../README.md) is the user-facing spec — routing rules, validation errors, import
naming, dev-server behavior, and the extraction checklist. `.claude/file-router.md` is the original
design spec the test suite mirrors. Consult the README before changing generated output or error
messages; both files should stay in sync with behavior changes.

## Tooling

Default to Bun instead of Node.js.

- `bun <file>` instead of `node <file>` or `ts-node <file>`
- `bun test` instead of `jest` or `vitest`
- `bun install` / `bun run <script>` / `bunx <pkg>` instead of the npm, yarn, or pnpm equivalents
- Bun loads `.env` automatically — don't use `dotenv`

Bun is the package manager and test runner; the dev server, HMR, and production build all go through
**Vite** (React 19, `react-router` v8). Don't reintroduce `Bun.serve()` HTML imports.

```sh
bun install
bun run dev        # vite dev server on http://localhost:5173
bun test           # unit + generation + integration suites
bun run typecheck  # tsc --noEmit
bun run lint       # eslint .
bun run lint:fix   # eslint . --fix
bun run build      # the published library: tsc → dist/, then copies 404.jsx + client.d.ts
```

ESLint is the only style authority — there is no Prettier, and the formatting is enforced by
ESLint's own core rules. `eslint.config.mjs` mirrors `sleepy-serv`'s: an explicit rule list, no
recommended presets, and no type-aware linting, so it stays fast and predictable.

Two version pins in `package.json` are load-bearing. `eslint` is pinned to `9.20.1` because ESLint
10 **removed** every core formatting rule this config is built from (`indent`, `quotes`, `semi`,
`max-len`, `comma-dangle`, …) and hard-errors on unknown rule ids rather than degrading; moving to
10 means adopting `@stylistic/eslint-plugin`, not bumping a version. `typescript` is held at
`^5.9.3` because `typescript-eslint@8` peer-requires `<6.1.0`. Don't "upgrade everything" without
reading this paragraph.

`build` produces the published package and nothing else — `dist/` is what `files` points at. It
uses `tsconfig.build.json`, which re-enables emit on top of the typecheck-only root config.

There is deliberately no build for the demo app. The demo exists to exercise the plugin under
`bun run dev`; it is never distributed, so nothing bundles it.

## The plugin

`src/plugin/index.ts` default-exports `fileRouter(options)`. Options: `inputPath` (default
`src/components/app`) and `outputPath` (optional debug artifact), both relative to the Vite root.
`outputPath` must not resolve inside `inputPath` — the plugin throws, since writing into the watched
tree would make it retrigger itself.

| Module | Responsibility |
| --- | --- |
| `index.ts` | Plugin hooks, virtual module, watcher, debounce. |
| `scan.ts` | Directory tree → `RouteTree`. |
| `validate.ts` | Leaf-`Page` rule, import-name collisions, `default` export checks. |
| `naming.ts` | Segment → import identifier. |
| `generate.ts` | `RouteTree` → module source; path resolution; debug-file writing. |
| `404.jsx` | Built-in fallback, used when the app defines no `404.{tsx,jsx}`. |

Load-bearing details:

- The app imports the virtual module `virtual:file-router/routes.jsx`. Both halves of that id are
  load-bearing: the `.jsx` suffix makes `@vitejs/plugin-react` transform the emitted JSX, and the
  missing `\0` prefix keeps plugin-react from filtering the id out. See `VIRTUAL_ROUTES_ID`.
- Validation runs in `buildStart`, not `load`, so a broken tree fails `vite build` and dev-server
  startup instead of surfacing on whichever request imports the routes first.
- Validation reports **every** failure at once, never just the first.
- `default` exports are validated by **parsing** (rolldown), never by evaluating user modules.
- Mid-session validation failures keep the dev server up: last good routes stay served, the error
  goes to the console and browser overlay, and fixing it clears the overlay.
- Regeneration only reloads when the emitted source actually changed — otherwise a `Page` edit would
  full-reload instead of hot-updating.
- Relative imports inside `src/plugin` carry explicit `.ts` extensions, required by Vite's native
  config loader.
- `BANNER` in `generate.ts` and the invalid-`default`-export message in `validate.ts` are string
  concatenations split **only** to fit the 80-column limit. Independent copies live in
  `tests/generate/generate.test.ts`, `tests/unit/validate.test.ts`, and the README, and
  `generate.test.ts` matches `outputPath must not be inside inputPath` as one phrase. Re-split
  those lines freely; never reword the text, and never let a seam fall inside an asserted
  substring.

## Demo app

- `index.html` is at the **project root** (Vite requires it) and loads `/src/main.tsx`.
- `src/main.tsx` mounts React into `#root`; `src/components/App.tsx` builds a `createBrowserRouter`
  from the config the virtual module default-exports, then renders `<RouterProvider>`.
- `src/components/app/` is the demo route tree — sub-directories are segments, `$param` directories
  are dynamic segments, each holding `Page.tsx` and/or `Layout.tsx`.
- `src/routes.jsx` is the debug copy written because `vite.config.ts` sets `outputPath`. It is
  **generated and gitignored — never edit it by hand.**
- `src/vite-env.d.ts` references `plugin/client.d.ts` so TypeScript knows the virtual module.
- Import `.css` and `.svg` directly from TS; client env vars must be prefixed `VITE_`.

There is no backend. If an API is needed later, add a separate server and point `server.proxy` at it
in `vite.config.ts`.

## Tests

`bunfig.toml` preloads `tests/setup.ts`, which registers happy-dom and then restores Node's timers
(Vite calls `.unref()` on its handles).

| Suite | What it covers |
| --- | --- |
| `tests/unit/` | Import naming, export validation, watch-event filtering. |
| `tests/generate/` | Directory tree → emitted source, over the full case matrix. |
| `tests/integration/<case>/integration.test.tsx` | A real Vite dev server over a fixture app. |

- Generation fixtures are built in temp directories via `withFixture` in `tests/helpers.ts`, because
  several cases hinge on *empty* directories, which git cannot track. Use `stabilize()` when
  snapshotting output that contains the built-in 404's absolute path.
- Integration fixtures are **checked in** under `tests/integration/<case>/src/` so bare specifiers
  like `react-router` resolve. Each case gets its own directory with one `integration.test.tsx`;
  `tests/integration/server.ts` boots the server and loads the virtual module.
- New behavior needs a case in the generation matrix, and a real-server test when it involves plugin
  hooks or the watcher.

## Conventions

- No semicolons, single quotes, two-space indent, trailing commas, a space before named-function
  parens (`function scan (dir)`), and an 80-column hard limit. `eslint.config.mjs` enforces all of
  it — run `bun run lint:fix` rather than hand-formatting.
- `any` is an error. The single exception is the rolldown AST alias in `validate.ts`, which carries
  an inline disable and a comment explaining why `unknown` would be worse.
- Comments explain *why* — the non-obvious constraint, not the mechanics. Match the existing density.
- Errors and warnings are prefixed `[vite-react-file-router]`.
- Only `src/plugin` may use `node:fs` / `node:path`; keep the demo app browser-only.

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
