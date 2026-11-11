import { describe, expect, it } from 'vitest'

import { zoomForPercent } from '../viewport/zoom-percent'
import { zoomReadout } from './zoom-readout'

describe('zoomReadout', () => {
  it.each([
    ['just below the half as the percent below', 99.49, '99%'],
    ['on the half as the percent above', 99.5, '100%'],
    ['just above the half as the percent above', 99.51, '100%'],
  ])('shows a zoom %s', (_role, percent, expected) => {
    expect(zoomReadout(zoomForPercent(percent))).toBe(expected)
  })

  it.each([
    ['the CSS mm as 100%', 96 / 25.4, '100%'],
    ['the initial 4 px per mm as 106%', 4, '106%'],
  ])('shows %s', (_role, pxPerMm, expected) => {
    expect(zoomReadout(pxPerMm)).toBe(expected)
  })
})
