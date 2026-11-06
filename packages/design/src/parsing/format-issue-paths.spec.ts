import { describe, expect, it } from 'vitest'

import { formatIssuePaths } from './format-issue-paths'

describe('formatIssuePaths', () => {
  it.each([
    ['no issues', [], ''],
    ['an issue at the root', [{ path: [] }], ''],
    ['one issue', [{ path: ['meta', 'note'] }], 'meta.note'],
    [
      'two issues, out of order',
      [{ path: ['meta', 'note'] }, { path: ['meta', 'form', 'tag'] }],
      'meta.form.tag, meta.note',
    ],
    ['a numeric segment', [{ path: ['layout', 'children', 0, 'note'] }], 'layout.children.0.note'],
  ])('dot-joins each path and comma-joins them sorted: %s', (_role, paths, expected) => {
    const issues = paths.map(({ path }) => ({ path, message: 'refused' }))

    expect(formatIssuePaths(issues)).toBe(expected)
  })
})
