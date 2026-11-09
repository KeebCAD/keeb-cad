import { describe, expect, it } from 'vitest'

import { aViolation } from './violation'

describe('aViolation', () => {
  it('returns a lane-failed warning about nothing by default', () => {
    expect(aViolation()).toEqual({
      kind: 'lane-failed',
      severity: 'warning',
      ids: [],
      message: 'a violation',
      fixes: [],
    })
  })

  it('lets the test set what it is about', () => {
    expect(aViolation({ message: 'first' })).toEqual({
      kind: 'lane-failed',
      severity: 'warning',
      ids: [],
      message: 'first',
      fixes: [],
    })
  })
})
