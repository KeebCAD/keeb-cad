import { describe, expect, it } from 'vitest'

import { hash } from './index'

describe('hash', () => {
  it('returns a SHA-256 hex digest', () => {
    expect(hash({ a: 1 })).toMatch(/^[0-9a-f]{64}$/)
  })

  it('does not change with key order', () => {
    expect(hash({ a: 1, b: { c: 'x', d: [1, 2] } })).toBe(hash({ b: { d: [1, 2], c: 'x' }, a: 1 }))
  })

  it('changes when a value changes', () => {
    expect(hash({ a: 1, b: 'x' })).not.toBe(hash({ a: 1, b: 'y' }))
    expect(hash({ a: [1, 2] })).not.toBe(hash({ a: [2, 1] }))
  })

  it('skips undefined fields', () => {
    expect(hash({ a: 1, b: undefined })).toBe(hash({ a: 1 }))
  })

  it('tells a string from a number', () => {
    expect(hash({ a: '1' })).not.toBe(hash({ a: 1 }))
  })

  it('tells NaN from null and Infinity from -Infinity', () => {
    expect(hash({ a: NaN })).not.toBe(hash({ a: null }))
    expect(hash({ a: Infinity })).not.toBe(hash({ a: -Infinity }))
    expect(hash({ a: Infinity })).not.toBe(hash({ a: null }))
  })

  it('throws on a value that is not plain data', () => {
    expect(() => hash({ a: new Map() })).toThrow(TypeError)
    expect(() => hash(new Date(0))).toThrow(TypeError)
  })
})
