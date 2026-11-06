import { describe, expect, it } from 'vitest'

import { aFormatVersion } from './format-version'

describe('aFormatVersion', () => {
  it('returns its argument as a format version', () => {
    expect(aFormatVersion(2)).toBe(2)
  })
})
