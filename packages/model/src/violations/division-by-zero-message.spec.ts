import { aParameterName } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { divisionByZeroMessage } from './division-by-zero-message'

describe('divisionByZeroMessage', () => {
  it('names the item whose expression divides by zero', () => {
    expect(divisionByZeroMessage([aParameterName('a')])).toBe(
      'The expression of "a" divides by zero.',
    )
  })
})
