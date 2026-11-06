import { describe, expect, it } from 'vitest'

import { aRevision } from './revision'

describe('aRevision', () => {
  it('returns its argument as a revision', () => {
    expect(aRevision('r2')).toBe('r2')
  })
})
