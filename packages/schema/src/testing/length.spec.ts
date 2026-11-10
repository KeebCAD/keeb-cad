import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { aLength } from './length'

describe('aLength', () => {
  it.each([
    ['its default when given none', () => aLength(), '19mm'],
    ['its argument', () => aLength('1.5mm'), '1.5mm'],
  ])('returns %s', (_role, build, expected) => {
    expect(build()).toBe(expected)
  })

  it('throws on a value its schema refuses', () => {
    expect(() => aLength('15deg')).toThrow(v.ValiError)
  })
})
