import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { declaredInputSchema } from './declared-input'
import { aPlainInput, aQuantityInput, anOptionInput, aQuantityInputValue } from './testing'

const without = (field: string, input: object) =>
  Object.fromEntries(Object.entries(input).filter(([key]) => key !== field))

const noUnit = without('unit', aQuantityInput())
const noOptions = without('options', anOptionInput())

describe('declaredInputSchema', () => {
  it.each([
    ['a quantity with a unit and no range', aQuantityInput()],
    ['a quantity with a range', { ...aQuantityInput(), range: { min: '0mm', max: '30mm' } }],
    ['an option with options', anOptionInput()],
    ['a boolean', aPlainInput('boolean')],
    ['a text', aPlainInput('text')],
  ])('passes %s', (_role, input) => {
    expect(v.safeParse(declaredInputSchema, input).success).toBe(true)
  })

  it.each([
    ['a quantity without a unit', noUnit],
    ['an option without options', noOptions],
    ['a unit on a boolean', { ...aPlainInput('boolean'), unit: 'mm' }],
    ['options on a quantity', { ...aQuantityInput(), options: ['a'] }],
    ['an empty options list', { ...anOptionInput(), options: [], default: '' }],
    ['an unparsable range minimum', { ...aQuantityInput(), range: { min: 'nope' } }],
    ['a part', { kind: 'part', label: 'Part', default: 'x' }],
    ['an anchor', { kind: 'anchor', label: 'Anchor', default: 'x' }],
    ['an asset', { kind: 'asset', label: 'Asset', default: 'x' }],
    ['a boolean default on a quantity', { ...aQuantityInput(), default: true }],
    ['an option default not in its options', { ...anOptionInput(), default: 'c' }],
    ['a number as a default', { ...aQuantityInput(), default: 19 }],
    [
      'a quantity value on a boolean',
      { ...aPlainInput('boolean'), default: aQuantityInputValue() },
    ],
  ])('refuses %s', (_role, input) => {
    expect(v.safeParse(declaredInputSchema, input).success).toBe(false)
  })
})
