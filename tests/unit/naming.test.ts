import { describe, expect, test } from 'bun:test'
import {
  importName,
  isDynamicSegment,
  pascalCase,
} from '../../src/plugin/naming'

describe('pascalCase', () => {
  test.each([
    ['users', 'Users'],
    ['last_week', 'LastWeek'],
    ['last-week', 'LastWeek'],
    ['lastWeek', 'LastWeek'],
    ['LastWeek', 'LastWeek'],
    ['userId', 'UserId'],
    ['my-very_longName', 'MyVeryLongName'],
    ['v2Beta', 'V2Beta'],
  ])('%s -> %s', (input, expected) => {
    expect(pascalCase(input)).toBe(expected)
  })
})

test('recognizes dynamic segments', () => {
  expect(isDynamicSegment('$userId')).toBe(true)
  expect(isDynamicSegment('users')).toBe(false)
})

describe('importName', () => {
  test('root directory yields a bare name', () => {
    expect(importName([], 'Page')).toBe('Page')
    expect(importName([], 'Layout')).toBe('Layout')
  })

  test.each([
    [['users'], 'Users_Page'],
    [['users', '$userId'], 'Users__UserId_Page'],
    [['blog', 'last_week'], 'Blog_LastWeek_Page'],
    [['blog', '$last-week'], 'Blog__LastWeek_Page'],
    [['blog', '$lastWeek'], 'Blog__LastWeek_Page'],
    [['blog', '$LastWeek'], 'Blog__LastWeek_Page'],
  ])('%s -> %s', (segments, expected) => {
    expect(importName(segments, 'Page')).toBe(expected)
  })

  test('kind is the suffix', () => {
    expect(importName(['users', '$userId'], 'Layout'))
      .toBe('Users__UserId_Layout')
  })

  // The spec's own example block lists four spellings collapsing to one name.
  // The generator can't emit that, so validate.ts has to reject it.
  test('all four spellings of a segment collide', () => {
    const spellings = ['last_week', 'last-week', 'lastWeek', 'LastWeek']

    const names = spellings.map(
      (segment) => importName(['blog', segment], 'Page'),
    )

    expect(new Set(names).size).toBe(1)
  })
})
