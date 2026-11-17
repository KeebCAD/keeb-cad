import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { negativeLengthMessage } from './negative-length-message'

describe('negativeLengthMessage', () => {
  it('names the item whose length is below 0 mm', () => {
    expect(negativeLengthMessage([anId('a')])).toBe('The length of "a" is below 0 mm.')
  })
})
