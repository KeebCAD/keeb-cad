import { describe, expect, it } from 'vitest'

import { formatNumber } from './format-number'

describe('formatNumber', () => {
  it('prints a whole length with its unit', () => {
    expect(formatNumber(19, 'mm')).toBe('19 mm')
  })

  it.each([
    ['just below the half', 1.004, '≈ 1 mm'],
    ['on the half', 1.005, '≈ 1.01 mm'],
    ['just above the half', 1.006, '≈ 1.01 mm'],
  ])('rounds %s at the second decimal', (_, value, expected) => {
    expect(formatNumber(value, 'mm')).toBe(expected)
  })

  it.each([
    ['just below the half', 0.0049, '≈ 0 mm'],
    ['on the half', 0.005, '≈ 0.01 mm'],
    ['just above the half', 0.0051, '≈ 0.01 mm'],
  ])('rounds %s of the smallest step', (_, value, expected) => {
    expect(formatNumber(value, 'mm')).toBe(expected)
  })

  it.each([
    ['one decimal', 1.1, '1.1 mm'],
    ['two decimals', 1.25, '1.25 mm'],
    ['three decimals', 1.255, '≈ 1.26 mm'],
  ])('prints %s exactly up to two and marks a third as rounded', (_, value, expected) => {
    expect(formatNumber(value, 'mm')).toBe(expected)
  })

  it('prints a negative value that rounds to zero as 0, unsigned', () => {
    expect(formatNumber(-0.004, 'mm')).toBe('≈ 0 mm')
  })

  it.each([
    ['zero', 0],
    ['negative zero', -0],
  ])('prints %s as 0', (_, value) => {
    expect(formatNumber(value, 'mm')).toBe('0 mm')
  })

  it.each([
    ['a rounded length', -1.005, 'mm', '≈ −1.01 mm'],
    ['an exact angle', -3.4, 'deg', '−3.4°'],
  ] as const)('signs %s with U+2212', (_, value, unit, expected) => {
    expect(formatNumber(value, unit)).toBe(expected)
  })

  it.each([
    ['a whole angle', 15, '15°'],
    ['a rounded angle', 0.123, '≈ 0.12°'],
  ])('appends ° to %s with no space', (_, value, expected) => {
    expect(formatNumber(value, 'deg')).toBe(expected)
  })

  it.each([
    ['a tiny value', 1e-7, '≈ 0 mm'],
    ['a huge value', 1e21, '1000000000000000000000 mm'],
  ])('expands %s that String writes with an exponent', (_, value, expected) => {
    expect(formatNumber(value, 'mm')).toBe(expected)
  })

  it('groups no digits of a large value', () => {
    expect(formatNumber(123_456.789, 'mm')).toBe('≈ 123456.79 mm')
  })

  it.each([NaN, Infinity, -Infinity])('throws on %s', (value) => {
    expect(() => formatNumber(value, 'mm')).toThrow(RangeError)
  })
})
