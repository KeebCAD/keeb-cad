import { describe, expect, it } from 'vitest'

import { nextBackoffDelay } from './next-backoff-delay'

describe('nextBackoffDelay', () => {
  it.each([
    ['the first delay', undefined, 1000],
    ['the second delay, doubling the first', 1000, 2000],
    ['the third delay, doubling the second', 2000, 4000],
    ['the fourth delay, doubling the third', 4000, 8000],
    ['the fifth delay, doubling the fourth', 8000, 16_000],
    ['the cap, when doubling would pass it', 16_000, 30_000],
    ['the cap, once on it', 30_000, 30_000],
  ])('returns %s', (_role, previous, expected) => {
    expect(nextBackoffDelay(previous)).toBe(expected)
  })
})
