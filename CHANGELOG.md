# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-09-07

### Added

- Optional `Error.{tsx,jsx}` component per route directory, whose `default`
  export becomes the route's `errorElement`. It catches whatever that route's
  `loader`, `Layout`, or `Page` throws, along with anything thrown by a route
  nested beneath it, and reads the error with `useRouteError()`.
- `react-router` renders the nearest boundary, so one `Error.{tsx,jsx}` at the
  root of `inputPath` covers the whole app while a deeper one narrows coverage
  to its own sub-routes. The plugin ships no fallback of its own; a route with
  no boundary above it still falls through to `react-router`'s default error
  page.
- `404.{tsx,jsx}` is now resolved per route directory, like `Page`, `Layout`,
  and `Error`, instead of once at the root of `inputPath`. Each one becomes a
  catch-all (`path: '*'`) child of its own route, so an unmatched path renders
  the nearest 404 above it and a section can have its own. A `Page`-less
  directory renders whichever 404 governs it, so `/users` and `/users/deep`
  agree. A single `404.{tsx,jsx}` at the root of `inputPath` still covers the
  whole app exactly as it did before.

### Removed

- **Breaking:** the built-in 404 component and the `vite-react-file-router/404`
  package export. Not-found UI now comes from the app's own `404.{tsx,jsx}`
  files, or from an `Error.{tsx,jsx}` boundary narrowing on
  `error.status === 404`. Consequently, with no `404.{tsx,jsx}` at or above it,
  an unmatched path raises `react-router`'s own 404 `ErrorResponse` for the
  nearest boundary rather than rendering a component, and a `Page`-less
  directory throws the same response. Apps that define `404.{tsx,jsx}` at the
  root of `inputPath` are unaffected.

## [0.4.0] - 2026-08-19

### Added

- Optional `meta.{ts,js}` file per route directory, with two optional named
  exports: `id` becomes the route's `id`, and `loader` becomes its `loader`.
  Each is emitted only when the module actually exports it, and a `meta` file
  exporting neither is a validation error.
- The metadata lands on the directory's own route rather than on the index
  child that renders its `Page`, so a `loader` runs for the segment and
  everything nested beneath it. A `Layout` reads it with `useLoaderData()`; a
  `Page` reads it with `useRouteLoaderData(id)`.
- Editing a `meta` file's contents regenerates the routes, since which of `id`
  and `loader` it exports decides what the route object contains.

## [0.3.0] - 2026-08-19

### Changed

- **Breaking:** the generated module now default-exports the route config array
  instead of a constructed `createBrowserRouter()`. Apps build their own router:
  `createBrowserRouter(routes)`. Generated code no longer imports `react-router`
  at all, so the config works with any router — memory, static, hash,
  `useRoutes` — and with Storybook's react-router addon.

## [0.2.0] - 2026-08-14

### Changed

- Dynamic-segment directories now use a leading `$` instead of `:` (e.g.
  `users/$userId`), matching the convention used by frameworks like Remix.
  `react-router`'s own path syntax is unchanged and still uses `:userId`.

## [0.1.0] - 2026-08-12

### Added

- Vite plugin that generates a `createBrowserRouter` config from the component
  directory tree, exposed as the virtual module
  `virtual:file-router/routes.jsx`.
- `Page` and `Layout` conventions per route directory, with `:param` directories
  becoming dynamic segments.
- Optional app-defined `404.{tsx,jsx}` at the root of `inputPath`, falling back
  to a built-in one.
- Validation that reports every problem at once — the leaf-`Page` rule, import
  name collisions, and missing or non-component `default` exports — checked by
  parsing rather than evaluating.
- Dev server watching that regenerates on tree changes, re-validates route
  component edits, and keeps serving the last good routes when validation fails.
- `outputPath` option that writes the same routes to disk as a debug artifact.
- `client` types entry declaring the virtual module for TypeScript.

[0.1.0]: https://github.com/travistrue2008/vite-react-file-router/releases/tag/0.1.0
[0.2.0]: https://github.com/travistrue2008/vite-react-file-router/compare/0.1.0...0.2.0
[0.3.0]: https://github.com/travistrue2008/vite-react-file-router/compare/0.2.0...0.3.0
[0.4.0]: https://github.com/travistrue2008/vite-react-file-router/compare/0.3.0...0.4.0
[Unreleased]: https://github.com/travistrue2008/vite-react-file-router/compare/0.5.0...HEAD
[0.5.0]: https://github.com/travistrue2008/vite-react-file-router/compare/0.4.0...0.5.0
