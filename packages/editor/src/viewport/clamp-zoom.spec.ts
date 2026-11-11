import { describe, expect, it } from 'vitest'

import { clampZoom } from './clamp-zoom'
import { zoomForPercent, zoomPercent } from './zoom-percent'

describe('clampZoom', () => {
  it.each([
    ['just below the minimum', 9.9, 10],
    ['on the minimum', 10, 10],
    ['just above the minimum', 10.1, 10.1],
    ['just below the maximum', 1999, 1999],
    ['on the maximum', 2000, 2000],
    ['just above the maximum', 2001, 2000],
  ])('clamps a zoom %s', (_role, percent, expectedPercent) => {
    expect(zoomPercent(clampZoom(zoomForPercent(percent)))).toBeCloseTo(expectedPercent, 9)
  })
})
