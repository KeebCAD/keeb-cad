import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { anAngle } from './angle'

describe('anAngle', () => {
  it.each([
    ['its default when given none', () => anAngle(), '0deg'],
    ['its argument', () => anAngle('-15deg'), '-15deg'],
  ])('returns %s', (_role, build, expected) => {
    expect(build()).toBe(expected)
  })

  it('throws on a value its schema refuses', () => {
    expect(() => anAngle('15mm')).toThrow(v.ValiError)
  })
})
