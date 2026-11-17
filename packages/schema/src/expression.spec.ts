import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { expressionSchema } from './expression'

describe('expressionSchema', () => {
  it.each([
    ['a literal with a unit', '19mm', true],
    ['a name', 'wall', true],
    ['an expression naming parameters', 'wall * 2 + gap', true],
    ['text the parser refuses', '1mm +', false],
  ])('on %s', (_role, input, expected) => {
    expect(v.safeParse(expressionSchema, input).success).toBe(expected)
  })

  it('declares itself an expression for the reference walk', () => {
    expect(v.getMetadata(expressionSchema)).toEqual({ expression: true })
  })
})
