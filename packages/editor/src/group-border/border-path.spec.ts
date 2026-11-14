import { describe, expect, it } from 'vitest'

import { borderPath } from './border-path'

describe('borderPath', () => {
  it('moves to the first point, lines to the rest and closes the loop', () => {
    const outer = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ]

    expect(borderPath(outer)).toBe('M 0 0 L 1 0 L 1 1 Z')
  })

  it('moves to a single point and closes', () => {
    expect(borderPath([{ x: 2, y: 3 }])).toBe('M 2 3 Z')
  })

  it('draws nothing for no points', () => {
    expect(borderPath([])).toBe('')
  })
})
