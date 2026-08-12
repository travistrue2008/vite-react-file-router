import { describe, expect, test } from 'bun:test'
import { shouldRegenerate, WATCH_EVENTS } from '../../src/plugin/index.ts'

const inputDir = '/app/src/components/app'

describe('shouldRegenerate', () => {
  test('ignores anything outside inputPath', () => {
    for (const event of WATCH_EVENTS) {
      expect(shouldRegenerate(event, '/app/src/routes.jsx', inputDir)).toBe(false)
      expect(shouldRegenerate(event, '/app/vite.config.ts', inputDir)).toBe(false)
    }
  })

  test('any structural event reshapes the tree', () => {
    for (const event of ['add', 'unlink', 'addDir', 'unlinkDir'] as const) {
      expect(shouldRegenerate(event, `${inputDir}/uploads`, inputDir)).toBe(true)
      expect(shouldRegenerate(event, `${inputDir}/uploads/notes.md`, inputDir)).toBe(
        true,
      )
    }
  })

  // Validation reads these files, so their contents can flip the build's outcome.
  test.each([
    'Page.tsx',
    'Page.jsx',
    'Layout.tsx',
    'Layout.jsx',
    '404.tsx',
    '404.jsx',
  ])('a content edit to %s regenerates', (file) => {
    expect(shouldRegenerate('change', `${inputDir}/uploads/${file}`, inputDir)).toBe(
      true,
    )
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
  ])('a content edit to %s does not', (file) => {
    expect(shouldRegenerate('change', `${inputDir}/uploads/${file}`, inputDir)).toBe(
      false,
    )
  })
})
