import { Option } from '@keeb-cad/result'
import { describe, expect, it } from 'vitest'

import type { Bounds, CanvasSize, ViewportValue } from './types'
import { viewportForBounds } from './viewport-for-bounds'

const PADDING = 24
const CANVAS: CanvasSize = { width: 648, height: 448 }
const ONE_KEY: Bounds = { x: -9, y: -9, width: 18, height: 18 }

describe('viewportForBounds', () => {
  it.each<[string, Bounds, ViewportValue['centre'], number]>([
    ['the width limits', { x: 10, y: 20, width: 100, height: 50 }, { x: 60, y: 45 }, 6],
    ['the height limits', { x: 10, y: 20, width: 50, height: 100 }, { x: 35, y: 70 }, 4],
  ])(
    'fits the canvas less the padding on each side where %s',
    (_role, bounds, expectedCentre, expectedZoom) => {
      expect(viewportForBounds(bounds, CANVAS, PADDING).getOrUndefined()).toEqual({
        centre: expectedCentre,
        zoom: expectedZoom,
      })
    },
  )

  it.each<[string, CanvasSize]>([
    ['a width just under twice the padding', { width: 47, height: 448 }],
    ['a width of twice the padding', { width: 48, height: 448 }],
    ['a height just under twice the padding', { width: 648, height: 47 }],
    ['a height of twice the padding', { width: 648, height: 48 }],
  ])('gives none for %s', (_role, size) => {
    expect(viewportForBounds(ONE_KEY, size, PADDING)).toEqual(Option.none())
  })

  it.each<[string, CanvasSize]>([
    ['a width just over twice the padding', { width: 49, height: 448 }],
    ['a height just over twice the padding', { width: 648, height: 49 }],
  ])('fits one 18 mm key into the 1 px left on %s', (_role, size) => {
    const expectedZoom = 1 / 18

    expect(viewportForBounds(ONE_KEY, size, PADDING).getOrUndefined()).toEqual({
      centre: { x: 0, y: 0 },
      zoom: expectedZoom,
    })
  })

  it('gives none for bounds with no extent', () => {
    const point = { x: 3, y: 4, width: 0, height: 0 }

    expect(viewportForBounds(point, CANVAS, PADDING)).toEqual(Option.none())
  })
})
