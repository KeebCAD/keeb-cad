import { frameOf } from '@keeb-cad/geometry'
import { describe, expect, it } from 'vitest'

import { placeSlot } from './place-slot'

const IDENTITY = [1, 0, 0, 1, 0, 0] as const

describe('placeSlot', () => {
  it('moves by the offset, then turns about the pivot in the node’s own frame', () => {
    const frame = placeSlot(IDENTITY, {
      position: { x: 10, y: 0 },
      rotation: 90,
      pivot: { x: -10, y: 0 },
    })

    expect(frameOf(frame)).toEqual({
      x: expect.closeTo(0, 9),
      y: expect.closeTo(10, 9),
      rot: expect.closeTo(90, 9),
    })
  })
})
