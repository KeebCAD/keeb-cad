import { describe, expect, it } from 'vitest'

import { panBy } from './pan-by'

describe('panBy', () => {
  it('moves the centre against the screen delta, y flipped, by the zoom', () => {
    const before = { centre: { x: 0, y: 0 }, zoom: 4 }

    expect(panBy(before, { x: 30, y: -20 })).toEqual({ centre: { x: -7.5, y: -5 }, zoom: 4 })
  })
})
