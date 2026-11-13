import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { unsupportedFormMessage } from './unsupported-form-message'

describe('unsupportedFormMessage', () => {
  it('names the design and the one form this version builds', () => {
    expect(unsupportedFormMessage([anId('d')])).toBe(
      `The design "d" can't be placed: this version builds only a split design with a reversible board.`,
    )
  })
})
