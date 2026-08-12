# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/travistrue2008/vite-react-file-router/compare/0.1.0...HEAD
[0.1.0]: https://github.com/travistrue2008/vite-react-file-router/releases/tag/0.1.0
