import { describe, expect, it } from 'vitest'

import { envelopeCorners } from './envelope-corners'

const DIGITS = 9

const corner = (x: number, y: number) => ({
  x: expect.closeTo(x, DIGITS),
  y: expect.closeTo(y, DIGITS),
})

describe('envelopeCorners', () => {
  it('turns the rectangle by its frame and moves it to the frame, counter-clockwise', () => {
    const frame = { x: 5, y: 0, rot: 90 }
    const rectangle = { w: 18, h: 10 }

    expect(envelopeCorners(frame, rectangle)).toEqual([
      corner(10, -9),
      corner(10, 9),
      corner(0, 9),
      corner(0, -9),
    ])
  })
})
