import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { anExpression } from './expression'

describe('anExpression', () => {
  it.each([
    ['its default when given none', () => anExpression(), '19mm'],
    ['its argument', () => anExpression('-15deg'), '-15deg'],
  ])('returns %s', (_role, build, expected) => {
    expect(build()).toBe(expected)
  })

  it('throws on a value its schema refuses', () => {
    expect(() => anExpression('nope')).toThrow(v.ValiError)
  })
})
