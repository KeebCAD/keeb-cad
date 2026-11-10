import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designSchema } from './design'
import { aDesign, aMeta } from './testing'

function issuePaths(value: unknown): unknown[][] {
  const result = v.safeParse(designSchema, value)
  return (result.issues ?? []).map((issue) => (issue.path ?? []).map((item) => item.key))
}

describe('metaSchema', () => {
  it.each([
    ['accepts', 'a length in mm', '1mm', []],
    ['refuses at the field', 'an angle in deg', '1deg', [['meta', 'gap', 'x']]],
    ['refuses at the field', 'text the parser refuses', 'one', [['meta', 'gap', 'x']]],
    ['refuses at the field', 'a number', 1, [['meta', 'gap', 'x']]],
  ])('%s a gap x of %s', (_outcome, _role, x, expected) => {
    const value = { ...aDesign(), meta: { ...aMeta(), gap: { ...aMeta().gap, x } } }

    expect(issuePaths(value)).toEqual(expected)
  })

  it('refuses a field it does not define, at that field', () => {
    const value = { ...aDesign(), meta: { ...aMeta(), key: { id: 'k1' } } }

    expect(issuePaths(value)).toEqual([['meta', 'key']])
  })
})
