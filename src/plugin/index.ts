import type { Plugin, ViteDevServer } from 'vite'
import {
  buildRouteTree,
  DEFAULT_INPUT_PATH,
  generate,
  resolvePaths,
  writeRoutesFile,
} from './generate.ts'
import type { RouteTree } from './scan.ts'

/**
 * The module the app imports.
 *
 * Two things about this id are load-bearing. It ends in `.jsx` so
 * `@vitejs/plugin-react` transforms the JSX it contains, and it is
 * deliberately *not* prefixed with `\0` — plugin-react filters null-byte ids
 * out, which would leave raw JSX to reach `vite:import-analysis` and fail the
 * request.
 */
export const VIRTUAL_ROUTES_ID = 'virtual:file-router/routes.jsx'

export type FileRouterOptions = {
  /** Route components directory, relative to the Vite root. */
  inputPath?: string
  /**
   * Optional debug artifact, relative to the Vite root. Writes the same routes
   * to disk so they can be read. Importing it works and stays in sync, but the
   * virtual module is the supported entry point.
   */
  outputPath?: string
}

/** Collapses a burst of file events (e.g. copying a directory) into one run. */
const DEBOUNCE_MS = 50

export const WATCH_EVENTS = [
  'add',
  'unlink',
  'addDir',
  'unlinkDir',
  'change',
] as const

export type WatchEvent = (typeof WATCH_EVENTS)[number]

/** Files whose *contents* the generated routes depend on. */
const WATCHED_FILE =
  /(?:^|[/\\])(?:(?:Page|Layout|404)\.(?:tsx|jsx)|meta\.(?:ts|js))$/

/**
 * Decides whether a watcher event can change the generated output.
 *
 * Adding or removing anything reshapes the tree. A content edit normally can't,
 * and is left to Fast Refresh — except in the files this plugin reads. A route
 * component's `default` export is validated, so without this, fixing a bad
 * export would emit only a `change` event and the plugin would never retry; a
 * `meta` module goes further still, since which of `id` and `loader` it exports
 * decides what the route object contains.
 */
export function shouldRegenerate (
  event: WatchEvent,
  path: string,
  inputDir: string,
): boolean {
  if (!path.startsWith(inputDir)) return false

  return event !== 'change' || WATCHED_FILE.test(path)
}

/**
 * Generates the `react-router` config from the route component directory tree,
 * so the file structure is the single source of truth for the app's routes.
 */
export default function fileRouter (options: FileRouterOptions = {}): Plugin {
  const { inputPath = DEFAULT_INPUT_PATH, outputPath } = options

  let root = process.cwd()
  let inputDir = ''
  let outputFile: string | undefined
  let source: string | undefined

  /**
   * Rescan, revalidate, re-render, and refresh the debug artifact if one is
   * configured. Reports whether the emitted routes actually changed — most file
   * events don't change them, and reloading anyway would cost Fast Refresh.
   */
  const rebuild = () => {
    const tree = buildRouteTree({
      root,
      inputPath,
    })

    if (outputFile) writeRoutesFile(tree, outputFile)

    const next = generate(tree)
    const changed = next !== source

    source = next

    return {
      source: next,
      changed,
    }
  }

  return {
    name: 'vite-react-file-router',
    enforce: 'pre',

    configResolved (config) {
      root = config.root

      // Also validates that outputPath doesn't sit inside the watched tree.
      ;({ inputDir, outputFile } = resolvePaths({
        root,
        inputPath,
        outputPath,
      }))
    },

    // Validating here rather than in load() means a broken tree fails the dev
    // server at startup and fails `vite build`, instead of surfacing later as a
    // module error on whichever request happens to import the routes first.
    buildStart () {
      rebuild()
    },

    resolveId (id) {
      // Returned unchanged — see VIRTUAL_ROUTES_ID on why there's no `\0`.
      if (id === VIRTUAL_ROUTES_ID) return VIRTUAL_ROUTES_ID
    },

    load (id) {
      if (id !== VIRTUAL_ROUTES_ID) return

      // Imports here are absolute: a virtual module has no directory of its own
      // for a relative specifier to resolve against.
      return source ?? rebuild().source
    },

    configureServer (server: ViteDevServer) {
      let timer: ReturnType<typeof setTimeout> | undefined
      let failed = false

      server.watcher.add(inputDir)

      const run = () => {
        try {
          const { changed } = rebuild()

          // Nothing else can reload a virtual module, so it has to happen
          // here — but only when the routes really changed, or when clearing a
          // stale error overlay. Otherwise a Page edit would reload instead of
          // hot-updating.
          if (!changed && !failed) return

          // Each environment caches the module separately, and the SSR graph
          // matters as much as the client one — that's what ssrLoadModule
          // reads.
          for (const environment of Object.values(server.environments)) {
            const graph = environment.moduleGraph
            const module = graph.getModuleById(VIRTUAL_ROUTES_ID)

            if (module) graph.invalidateModule(module)
          }

          failed = false
          server.ws.send({ type: 'full-reload' })
        } catch (error) {
          // Keep the last good tree in memory and the server alive; surface the
          // failure in the browser overlay instead of exiting.
          const err = error as Error

          failed = true
          server.config.logger.error(err.message, { timestamp: true })

          server.ws.send({
            type: 'error',
            err: {
              message: err.message,
              stack: '',
            },
          })
        }
      }

      const onEvent = (event: WatchEvent) => (path: string) => {
        if (!shouldRegenerate(event, path, inputDir)) return

        clearTimeout(timer)
        timer = setTimeout(run, DEBOUNCE_MS)
      }

      for (const event of WATCH_EVENTS) {
        server.watcher.on(event, onEvent(event))
      }
    },
  }
}

export { buildRouteTree, generate, writeRoutesFile } from './generate.ts'
export type { MetaExports, RouteMeta } from './meta.ts'
export type { RouteNode, RouteTree } from './scan.ts'
