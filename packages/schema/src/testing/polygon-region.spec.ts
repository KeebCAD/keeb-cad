import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { polygonRegionSchema } from '../polygon-region'
import { aPolygonRegion, aSlotSpace } from './polygon-region'

describe('aPolygonRegion', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(polygonRegionSchema, aPolygonRegion()).issues).toBeUndefined()
  })

  it.each([
    ['outer', { outer: [{ x: 2, y: 3 }] }],
    ['holes', { holes: [[{ x: 4, y: 5 }]] }],
  ])('keeps the %s it is given', (_field, fields) => {
    expect(aPolygonRegion(fields)).toMatchObject(fields)
  })
})

describe('aSlotSpace', () => {
  it('builds regions their schema accepts', () => {
    expect(v.safeParse(v.array(polygonRegionSchema), aSlotSpace()).issues).toBeUndefined()
  })

  it('builds the rectangle of the size it is given, centred on the origin', () => {
    expect(aSlotSpace({ width: 27, height: 18 })).toEqual([
      {
        outer: [
          { x: -13.5, y: -9 },
          { x: 13.5, y: -9 },
          { x: 13.5, y: 9 },
          { x: -13.5, y: 9 },
        ],
        holes: [],
      },
    ])
  })
})
