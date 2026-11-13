import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { borderSchema } from '../border'
import { aBorder, aBorderRegion } from './border'

describe('aBorder', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(borderSchema, aBorder()).issues).toBeUndefined()
  })

  it('keeps the regions it is given', () => {
    const regions = [aBorderRegion(), aBorderRegion({ outer: [{ x: 5, y: 5 }] })]

    expect(aBorder(regions)).toEqual(regions)
  })
})

describe('aBorderRegion', () => {
  it.each([
    ['outer', { outer: [{ x: 2, y: 3 }] }],
    ['holes', { holes: [[{ x: 4, y: 5 }]] }],
  ])('keeps the %s it is given', (_field, fields) => {
    expect(aBorderRegion(fields)).toMatchObject(fields)
  })
})
