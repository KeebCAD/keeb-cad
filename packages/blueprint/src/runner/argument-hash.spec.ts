import { describe, expect, it } from 'vitest'

import { argumentHash } from './argument-hash'

const inputs = { size: '1u', width: { type: 'quantity', value: '18mm' } }

describe('argumentHash', () => {
  it('is the same for the same inputs', () => {
    expect(argumentHash(inputs)).toBe(argumentHash({ ...inputs }))
  })

  it('differs when one input changes', () => {
    expect(argumentHash({ ...inputs, size: '1.5u' })).not.toBe(argumentHash(inputs))
  })
})
