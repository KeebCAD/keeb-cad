import { describe, expect, it } from 'vitest'

import { readWheel } from './read-wheel'

const { DOM_DELTA_PIXEL: PIXELS, DOM_DELTA_LINE: LINES, DOM_DELTA_PAGE: PAGES } = WheelEvent
const NOTCH_IN = { kind: 'notch', direction: 'in' }
const NOTCH_OUT = { kind: 'notch', direction: 'out' }

function panOf(x: number, y: number) {
  return { kind: 'pan', delta: { x, y } }
}

describe('readWheel', () => {
  it.each([
    ['a step just below the notch minimum as a pan', 49, panOf(0, 49)],
    ['a step on the notch minimum as a notch out', 50, NOTCH_OUT],
    ['a step just above the notch minimum as a notch out', 51, NOTCH_OUT],
    ['an upward step just below the notch minimum as a pan', -49, panOf(0, -49)],
    ['an upward step on the notch minimum as a notch in', -50, NOTCH_IN],
    ['an upward step just above the notch minimum as a notch in', -51, NOTCH_IN],
  ])('reads a vertical pixel %s', (_role, deltaY, expected) => {
    expect(readWheel({ deltaMode: PIXELS, deltaX: 0, deltaY })).toEqual(expected)
  })

  it.each([
    ['a line step down as a notch out', LINES, 3, NOTCH_OUT],
    ['a line step up as a notch in', LINES, -3, NOTCH_IN],
    ['a page step down as a notch out', PAGES, 1, NOTCH_OUT],
  ])('reads %s', (_role, deltaMode, deltaY, expected) => {
    expect(readWheel({ deltaMode, deltaX: 0, deltaY })).toEqual(expected)
  })

  it('reads a sideways line step as nothing', () => {
    expect(readWheel({ deltaMode: LINES, deltaX: 3, deltaY: 0 })).toEqual({ kind: 'none' })
  })

  it.each([
    ['with a sideways part', 2, 100],
    ['of a fractional step', 0, 50.5],
  ])('reads a pixel step %s as a pan', (_role, deltaX, deltaY) => {
    expect(readWheel({ deltaMode: PIXELS, deltaX, deltaY })).toEqual(panOf(deltaX, deltaY))
  })
})
