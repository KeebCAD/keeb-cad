import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { partRefSchema } from './part-ref'

describe('partRefSchema', () => {
  it.each([
    ['a library part', 'lib:part/x', true],
    ['a design part id', 'my-part', true],
    ['the library prefix with no name', 'lib:part/', false],
    ['another library kind', 'lib:other/x', false],
  ])('on %s', (_role, input, expected) => {
    expect(v.safeParse(partRefSchema, input).success).toBe(expected)
  })
})
