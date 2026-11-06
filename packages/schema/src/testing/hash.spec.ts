import { describe, expect, it } from 'vitest'

import { aHash } from './hash'

describe('aHash', () => {
  it('returns its argument as a hash', () => {
    expect(aHash('h2')).toBe('h2')
  })
})
