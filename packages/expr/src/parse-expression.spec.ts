import { describe, expect, it } from 'vitest'

import { parseExpression } from './parse-expression'

const NINES = '9'.repeat(308)
const OVERFLOWING = '9'.repeat(309)
const MAX_VALUE_DIGITS = BigInt(Number.MAX_VALUE).toString()

describe('parseExpression', () => {
  it.each([
    ['a whole length', '19mm', { value: 19, unit: 'mm' }],
    ['a negative angle', '-15deg', { value: -15, unit: 'deg' }],
    ['a fraction', '0.5mm', { value: 0.5, unit: 'mm' }],
    ['negative zero, which the grammar admits', '-0mm', { value: -0, unit: 'mm' }],
    [
      'the digits of the largest double',
      `${MAX_VALUE_DIGITS}mm`,
      { value: Number.MAX_VALUE, unit: 'mm' },
    ],
  ])('reads %s', (_role, input, expected) => {
    expect(parseExpression(input).match({ ok: (v) => v, err: () => null })).toEqual(expected)
  })

  it('reads the longest run of nines a double still holds', () => {
    const value = parseExpression(`${NINES}mm`).match({ ok: (v) => v.value, err: () => NaN })
    expect(Number.isFinite(value)).toBe(true)
  })

  it.each([
    ['a space before the unit', '19 mm'],
    ['a plus sign', '+19mm'],
    ['an exponent', '1e2mm'],
    ['no leading digit', '.5mm'],
    ['no unit', '19'],
    ['an upper-case unit', '19MM'],
    ['no digit after the point', '19.mm'],
    ['a minus with no digits', '-mm'],
    ['two points', '5.5.5mm'],
    ['text after the unit', '19mmx'],
    ['a leading space', ' 19mm'],
    ['a trailing space', '19mm '],
    ['the empty string', ''],
    ['a run of nines one digit past the largest double', `${OVERFLOWING}mm`],
  ])('refuses %s', (_role, input) => {
    expect(parseExpression(input).match({ ok: () => null, err: (e) => e })).toEqual({
      kind: 'expression-parse-failed',
      input,
    })
  })
})
