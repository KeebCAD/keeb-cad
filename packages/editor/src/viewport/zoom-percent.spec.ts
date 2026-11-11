import { describe, expect, it } from 'vitest'

import { zoomForPercent, zoomPercent } from './zoom-percent'

const CSS_MM = 96 / 25.4

describe('zoomPercent', () => {
  it.each([
    ['the CSS mm as 100%', CSS_MM, 100],
    ['the initial 4 px per mm as just under 106%', 4, 105.833333],
  ])('reads %s', (_role, zoom, expectedPercent) => {
    expect(zoomPercent(zoom)).toBeCloseTo(expectedPercent, 6)
  })
})

describe('zoomForPercent', () => {
  it('gives 100% as the CSS mm', () => {
    expect(zoomForPercent(100)).toBeCloseTo(CSS_MM, 12)
  })
})
