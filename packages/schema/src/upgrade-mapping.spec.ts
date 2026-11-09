import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { upgradeMappingSchema } from './upgrade-mapping'

describe('upgradeMappingSchema', () => {
  it.each([
    ['a previous version alone', { from: 1 }, true],
    [
      'every optional part',
      { from: 1, renames: { a: 'b' }, defaults: { c: true }, convert: { d: '1mm' } },
      true,
    ],
    ['no previous version', {}, false],
    ['a conversion that does not parse', { from: 1, convert: { d: 'nope' } }, false],
  ])('on %s', (_role, input, expected) => {
    expect(v.safeParse(upgradeMappingSchema, input).success).toBe(expected)
  })
})
