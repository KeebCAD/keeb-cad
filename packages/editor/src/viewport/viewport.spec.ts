import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import type { Bounds, CanvasSize, ViewportValue } from './types'
import { Viewport } from './viewport'

const DESIGN = anId('corne')
const INITIAL: ViewportValue = { centre: { x: 0, y: 0 }, zoom: 4 }
const ONE_KEY: Bounds = { x: -9, y: -9, width: 18, height: 18 }

function fitted(bounds: Bounds, size: CanvasSize): ViewportValue {
  const viewport = new Viewport()
  viewport.fitOnce(DESIGN, bounds, size)
  return viewport.value
}

describe('Viewport', () => {
  it('opens at its initial value', () => {
    expect(new Viewport().value).toEqual(INITIAL)
  })

  it.each<[string, Bounds, ViewportValue['centre'], number]>([
    ['the width limits', { x: 10, y: 20, width: 100, height: 50 }, { x: 60, y: 45 }, 6],
    ['the height limits', { x: 10, y: 20, width: 50, height: 100 }, { x: 35, y: 70 }, 4],
  ])(
    'fits a 648 by 448 canvas less 24 px padding where %s',
    (_role, bounds, expectedCentre, expectedZoom) => {
      expect(fitted(bounds, { width: 648, height: 448 })).toEqual({
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
  ])('keeps its initial value for %s', (_role, size) => {
    expect(fitted(ONE_KEY, size)).toEqual(INITIAL)
  })

  it.each<[string, CanvasSize]>([
    ['a width just over twice the padding', { width: 49, height: 448 }],
    ['a height just over twice the padding', { width: 648, height: 49 }],
  ])('fits one 18 mm key into the 1 px left on %s', (_role, size) => {
    const expectedZoom = 1 / 18

    expect(fitted(ONE_KEY, size)).toEqual({ centre: { x: 0, y: 0 }, zoom: expectedZoom })
  })

  it('keeps its initial value for bounds with no extent', () => {
    expect(fitted({ x: 3, y: 4, width: 0, height: 0 }, { width: 648, height: 448 })).toEqual(
      INITIAL,
    )
  })

  it('fits a design once, leaving a later change in place', () => {
    const viewport = new Viewport()
    viewport.fitOnce(DESIGN, ONE_KEY, { width: 648, height: 448 })
    viewport.setZoom(1)

    viewport.fitOnce(DESIGN, ONE_KEY, { width: 648, height: 448 })

    expect(viewport.zoom).toBe(1)
  })

  it('fits a design the canvas was too small to fit once it is large enough', () => {
    const viewport = new Viewport()
    viewport.fitOnce(DESIGN, ONE_KEY, { width: 48, height: 448 })

    viewport.fitOnce(DESIGN, ONE_KEY, { width: 49, height: 448 })

    expect(viewport.zoom).toBe(1 / 18)
  })

  it('fits another design after one was fitted', () => {
    const viewport = new Viewport()
    viewport.fitOnce(DESIGN, ONE_KEY, { width: 648, height: 448 })

    viewport.fitOnce(
      anId('lily58'),
      { x: 91, y: -9, width: 18, height: 18 },
      {
        width: 648,
        height: 448,
      },
    )

    expect(viewport.centre).toEqual({ x: 100, y: 0 })
  })
})
