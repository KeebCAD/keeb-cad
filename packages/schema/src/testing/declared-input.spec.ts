import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { declaredInputSchema } from '../declared-input'
import { aDeclaredInput, anOptionInput, aPlainInput, aQuantityInput } from './declared-input'

describe('the declared input builders', () => {
  it.each(['quantity', 'option', 'boolean', 'text'] as const)(
    'aDeclaredInput builds a valid %s input',
    (kind) => {
      expect(v.parse(declaredInputSchema, aDeclaredInput(kind))).toMatchObject({ kind })
    },
  )

  it('aQuantityInput takes overrides', () => {
    expect(aQuantityInput({ unit: 'deg' })).toMatchObject({ unit: 'deg' })
  })

  it('anOptionInput takes overrides', () => {
    expect(anOptionInput({ label: 'Kind' })).toMatchObject({ label: 'Kind' })
  })

  it.each(['boolean', 'text'] as const)('aPlainInput builds a %s', (kind) => {
    expect(aPlainInput(kind)).toMatchObject({ kind })
  })
})
