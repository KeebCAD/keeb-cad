import { describe, expect, it } from 'vitest'

import type { Point } from './types'
import { isWellFormed } from './well-formed'

const SQUARE: Point[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
]
const COLLINEAR: Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 2, y: 2 },
]
const CLOCKWISE_HOLE: Point[] = [
  { x: 4, y: 4 },
  { x: 4, y: 6 },
  { x: 6, y: 6 },
  { x: 6, y: 4 },
]

describe('isWellFormed', () => {
  it.each([
    ['2 points', SQUARE.slice(0, 2), false],
    ['3 points', SQUARE.slice(0, 3), true],
    ['4 points', SQUARE, true],
  ])('on a counter-clockwise outer loop of %s', (_role, outer, expected) => {
    expect(isWellFormed([{ outer, holes: [] }])).toBe(expected)
  })

  it.each([
    ['2 points', CLOCKWISE_HOLE.slice(0, 2), false],
    ['3 points', CLOCKWISE_HOLE.slice(0, 3), true],
  ])('on a clockwise hole of %s', (_role, hole, expected) => {
    expect(isWellFormed([{ outer: SQUARE, holes: [hole] }])).toBe(expected)
  })

  it.each([
    ['counter-clockwise', SQUARE, true],
    ['3 collinear points, of zero area', COLLINEAR, false],
    ['clockwise', SQUARE.toReversed(), false],
  ])('on an outer loop %s', (_role, outer, expected) => {
    expect(isWellFormed([{ outer, holes: [] }])).toBe(expected)
  })

  it.each([
    ['clockwise', CLOCKWISE_HOLE, true],
    [
      '3 collinear points, of zero area',
      COLLINEAR.map(({ x, y }) => ({ x: x + 4, y: y + 4 })),
      false,
    ],
    ['counter-clockwise', CLOCKWISE_HOLE.toReversed(), false],
  ])('on a hole %s', (_role, hole, expected) => {
    expect(isWellFormed([{ outer: SQUARE, holes: [hole] }])).toBe(expected)
  })

  it('refuses a loop that repeats its first point', () => {
    expect(isWellFormed([{ outer: [...SQUARE, { x: 0, y: 0 }], holes: [] }])).toBe(false)
  })

  it('refuses no regions', () => {
    expect(isWellFormed([])).toBe(false)
  })
})
