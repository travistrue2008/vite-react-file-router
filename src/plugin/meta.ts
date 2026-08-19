/**
 * `meta.{ts,js}` — the optional per-directory metadata module.
 *
 * Two named exports are recognized, both optional: `id` becomes the route
 * object's `id`, and `loader` becomes its `loader`. *Which* of them exist
 * decides what the generator emits, so this is read during the scan rather
 * than left to validation.
 */
import { exportedName, parseModule, type Node } from './parse.ts'

export type MetaExport = 'id' | 'loader'

export type MetaExports = Record<MetaExport, boolean>

export type RouteMeta = {
  /** Absolute path to `meta.{ts,js}`. */
  path: string
  /** Which of `id` and `loader` the module actually exports. */
  exports: MetaExports
}

function isRecognized (name: string | undefined): name is MetaExport {
  return name === 'id' || name === 'loader'
}

/** Every name a binding pattern introduces. */
function bindingNames (pattern: Node | null | undefined): string[] {
  if (!pattern) return []

  switch (pattern.type) {
    case 'Identifier':
      return [pattern.name]

    case 'ObjectPattern':
      return pattern.properties.flatMap((property: Node) =>
        bindingNames(property.value ?? property.argument),
      )

    case 'ArrayPattern':
      return pattern.elements.flatMap(
        (element: Node | null) => bindingNames(element),
      )

    case 'AssignmentPattern':
      return bindingNames(pattern.left)

    default:
      return []
  }
}

/** The names an `export`ed declaration binds at module scope. */
function declaredNames (declaration: Node): string[] {
  if (declaration.type !== 'VariableDeclaration') {
    return bindingNames(declaration.id)
  }

  return declaration.declarations.flatMap(
    (declarator: Node) => bindingNames(declarator.id),
  )
}

/**
 * Reads which of `id` / `loader` a meta module exports.
 *
 * A bare `export * from './x'` marks both present: what it re-exports can't be
 * known statically, which is the same call validate.ts makes for a `default`
 * export bound to an import. Emitting an `id` or `loader` that turns out
 * undefined costs nothing — react-router treats either exactly as absent.
 */
export function readMetaExports (filePath: string): MetaExports {
  const exports: MetaExports = {
    id: false,
    loader: false,
  }

  for (const statement of parseModule(filePath)) {
    // `export * as ns from './x'` exports one namespace, not `ns`'s members.
    if (statement.type === 'ExportAllDeclaration' && !statement.exported) {
      return {
        id: true,
        loader: true,
      }
    }

    if (statement.type !== 'ExportNamedDeclaration') continue

    const names: (string | undefined)[] = statement.declaration
      ? declaredNames(statement.declaration)
      : (statement.specifiers ?? []).map(exportedName)

    for (const name of names) {
      if (isRecognized(name)) exports[name] = true
    }
  }

  return exports
}
