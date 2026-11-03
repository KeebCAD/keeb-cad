import { describe, expect, it } from 'vitest'

import { encodeCanonical } from './canonical-encoding'

describe('encodeCanonical', () => {
  it('ignores key order', () => {
    expect(encodeCanonical({ b: 1, a: { d: [1, 2], c: 'x' } })).toBe(
      encodeCanonical({ a: { c: 'x', d: [1, 2] }, b: 1 }),
    )
  })

  it('sorts keys by UTF-16 code units', () => {
    expect(encodeCanonical({ b: 1, a: 2, B: 3, é: 4 })).toBe('{"B":3,"a":2,"b":1,"é":4}')
  })

  it('writes numbers in JSON form', () => {
    expect(encodeCanonical([1, 1.5, -0, 1e21, 1e-6])).toBe('[1,1.5,0,1e+21,0.000001]')
  })

  it('encodes an undefined property as absent', () => {
    expect(encodeCanonical({ a: 1, b: undefined })).toBe(encodeCanonical({ a: 1 }))
  })

  it.each([
    ['a class instance', new Date(0)],
    ['a map', new Map()],
    ['a function', () => 1],
    ['a non-finite number', NaN],
    ['undefined in an array', [undefined]],
    ['a bigint', 1n],
  ])('throws on %s', (_name, value) => {
    expect(() => encodeCanonical(value)).toThrow(TypeError)
  })
})
