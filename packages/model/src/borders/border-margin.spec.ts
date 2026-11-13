import { describe, expect, it } from 'vitest'

import { borderMargin } from './border-margin'

describe('borderMargin', () => {
  it.each([
    ['just below the 1 mm floor', { x: 0.5, y: 0.5 }, 1],
    ['on the 1 mm floor', { x: 1, y: 1 }, 1],
    ['just above the 1 mm floor', { x: 1.5, y: 1.5 }, 1.5],
    ['taking the smaller axis', { x: 2, y: 1.5 }, 1.5],
    ['negative', { x: -0.5, y: -0.5 }, 1],
  ])('gives a gap %s its margin', (_role, gap, expectedMargin) => {
    expect(borderMargin(gap)).toBe(expectedMargin)
  })
})
