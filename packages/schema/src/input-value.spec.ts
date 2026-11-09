import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { inputValueSchema } from './input-value'

describe('inputValueSchema', () => {
  it.each([
    ['a boolean', true, true],
    ['a string', 'x', true],
    ['a tagged quantity', { type: 'quantity', value: '19mm' }, true],
    ['a tagged quantity that does not parse', { type: 'quantity', value: 'nope' }, false],
    ['a number', 19, false],
  ])('on %s', (_role, input, expected) => {
    expect(v.safeParse(inputValueSchema, input).success).toBe(expected)
  })
})
