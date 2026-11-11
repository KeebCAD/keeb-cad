import { describe, expect, it } from 'vitest'

import type { ViewportValue } from './types'
import { screenToModel } from './viewport-transform'
import { zoomAt } from './zoom-at'
import { zoomForPercent, zoomPercent } from './zoom-percent'

const SIZE = { width: 648, height: 448 }
const CENTRE_OF_CANVAS = { x: 324, y: 224 }
const OFF_CENTRE = { x: 100, y: 50 }
const DIGITS = 9
// One wheel notch (EXPERIENCE.md: ×1.1 per wheel notch).
const NOTCH = 1.1

function at(percent: number): ViewportValue {
  return { centre: { x: 7, y: -3 }, zoom: zoomForPercent(percent) }
}

function percentAfter(percent: number, factor: number): number {
  return zoomPercent(zoomAt(at(percent), CENTRE_OF_CANVAS, factor, SIZE).zoom)
}

describe('zoomAt', () => {
  it.each([
    ['a notch out that lands on the minimum', 11, 10],
    ['a notch out that would pass the minimum, at the minimum', 10.9, 10],
    ['a notch out that stays above the minimum, unclamped', 11.1, 10.090909],
  ])('stops %s', (_role, percent, expectedPercent) => {
    expect(percentAfter(percent, 1 / NOTCH)).toBeCloseTo(expectedPercent, 6)
  })

  it.each([
    ['a notch in that stays below the maximum, unclamped', 1800, 1980],
    ['a notch in that lands on the maximum', 2000 / NOTCH, 2000],
    ['a notch in that would pass the maximum, at the maximum', 1900, 2000],
  ])('takes %s', (_role, percent, expectedPercent) => {
    expect(percentAfter(percent, NOTCH)).toBeCloseTo(expectedPercent, 6)
  })

  it.each([
    ['a notch in', 100, NOTCH],
    ['a notch in clamped at the maximum', 1900, NOTCH],
  ])('keeps the model point under the screen point for %s', (_role, percent, factor) => {
    const before = at(percent)

    const after = zoomAt(before, OFF_CENTRE, factor, SIZE)

    const fixed = screenToModel(OFF_CENTRE, before, SIZE)
    expect(screenToModel(OFF_CENTRE, after, SIZE)).toEqual({
      x: expect.closeTo(fixed.x, DIGITS),
      y: expect.closeTo(fixed.y, DIGITS),
    })
  })
})
