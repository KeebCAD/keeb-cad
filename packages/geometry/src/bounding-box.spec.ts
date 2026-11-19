import { describe, expect, it } from 'vitest'

import { boundingBox } from './bounding-box'

// An L whose arms are 18 wide, its corner square from (−9, −9) to (9, 9).
const L_SHAPE = {
  outer: [
    { x: -9, y: -9 },
    { x: 27, y: -9 },
    { x: 27, y: 9 },
    { x: 9, y: 9 },
    { x: 9, y: 27 },
    { x: -9, y: 27 },
  ],
  holes: [],
}

describe('boundingBox', () => {
  it('spans every point of an L', () => {
    expect(boundingBox([L_SHAPE])).toEqual({ minX: -9, minY: -9, maxX: 27, maxY: 27 })
  })

  it('is a point at the origin for no regions', () => {
    expect(boundingBox([])).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
  })
})
