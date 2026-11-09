import { describe, expect, it } from 'vitest'

import { aQuantityInputValue } from './quantity-input-value'

describe('aQuantityInputValue', () => {
  it('tags its expression as a quantity', () => {
    expect(aQuantityInputValue('5mm')).toEqual({ type: 'quantity', value: '5mm' })
  })
})
