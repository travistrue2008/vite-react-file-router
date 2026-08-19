import { describe, expect, test } from 'bun:test'
import { shouldRegenerate, WATCH_EVENTS } from '../../src/plugin/index.ts'

const inputDir = '/app/src/components/app'

/** A content edit to `file` inside a route directory. */
const onChange = (file: string) =>
  shouldRegenerate('change', `${inputDir}/uploads/${file}`, inputDir)

describe('shouldRegenerate', () => {
  test('ignores anything outside inputPath', () => {
    for (const event of WATCH_EVENTS) {
      const routes = shouldRegenerate(event, '/app/src/routes.jsx', inputDir)
      const config = shouldRegenerate(event, '/app/vite.config.ts', inputDir)

      expect(routes).toBe(false)
      expect(config).toBe(false)
    }
  })

  test('any structural event reshapes the tree', () => {
    for (const event of ['add', 'unlink', 'addDir', 'unlinkDir'] as const) {
      const dir = shouldRegenerate(event, `${inputDir}/uploads`, inputDir)

      const file = shouldRegenerate(
        event,
        `${inputDir}/uploads/notes.md`,
        inputDir,
      )

      expect(dir).toBe(true)
      expect(file).toBe(true)
    }
  })

  // The plugin reads these files, so their contents can flip the build's
  // outcome — or, for `meta`, change the emitted route object outright.
  test.each([
    'Page.tsx',
    'Page.jsx',
    'Layout.tsx',
    'Layout.jsx',
    '404.tsx',
    '404.jsx',
    'meta.ts',
    'meta.js',
  ])('a content edit to %s regenerates', (file) => {
    expect(onChange(file)).toBe(true)
  })

  // Everything else is Fast Refresh's job, and re-parsing the tree on every
  // keystroke-save of an unrelated file would be pure waste.
  test.each([
    'styles.css',
    'helper.ts',
    'Page.test.tsx',
    'PageHeader.tsx',
    'MyLayout.tsx',
    'Page.md',
    'Meta.ts',
    'meta.tsx',
    'meta.config.ts',
  ])('a content edit to %s does not', (file) => {
    expect(onChange(file)).toBe(false)
  })
})
