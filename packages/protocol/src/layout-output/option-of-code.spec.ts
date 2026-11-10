import { describe, expect, it } from 'vitest'

import { kindCodes } from './layout-codes'
import { optionOfCode } from './option-of-code'

describe('optionOfCode', () => {
  it('reads the option a known code stands for', () => {
    expect(optionOfCode(kindCodes, 1)).toBe('group')
  })

  it('refuses a code no option has', () => {
    expect(() => optionOfCode(kindCodes, 9)).toThrow(RangeError)
  })
})
