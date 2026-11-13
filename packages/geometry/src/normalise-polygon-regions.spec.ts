import { describe, expect, it } from 'vitest'

import { normalisePolygonRegions } from './normalise-polygon-regions'

describe('normalisePolygonRegions', () => {
  it('winds outers counter-clockwise and holes clockwise, starts each loop at its lowest-then-leftmost point and sorts regions and holes by it', () => {
    const rightRegion = {
      outer: [
        { x: 30, y: 10 },
        { x: 20, y: 10 },
        { x: 20, y: 0 },
        { x: 30, y: 0 },
      ],
      holes: [],
    }
    const leftRegion = {
      outer: [
        { x: 10, y: 10 },
        { x: 10, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 10 },
      ],
      holes: [
        [
          { x: 8, y: 4 },
          { x: 8, y: 2 },
          { x: 6, y: 2 },
          { x: 6, y: 4 },
        ],
        [
          { x: 4, y: 4 },
          { x: 2, y: 4 },
          { x: 2, y: 2 },
          { x: 4, y: 2 },
        ],
      ],
    }

    expect(normalisePolygonRegions([rightRegion, leftRegion])).toEqual([
      {
        outer: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10 },
        ],
        holes: [
          [
            { x: 2, y: 2 },
            { x: 2, y: 4 },
            { x: 4, y: 4 },
            { x: 4, y: 2 },
          ],
          [
            { x: 6, y: 2 },
            { x: 6, y: 4 },
            { x: 8, y: 4 },
            { x: 8, y: 2 },
          ],
        ],
      },
      {
        outer: [
          { x: 20, y: 0 },
          { x: 30, y: 0 },
          { x: 30, y: 10 },
          { x: 20, y: 10 },
        ],
        holes: [],
      },
    ])
  })
})
