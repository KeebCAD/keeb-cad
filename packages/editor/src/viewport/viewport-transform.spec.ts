import { describe, expect, it } from 'vitest'

import type { ViewportValue } from './types'
import { modelToScreen, screenToModel } from './viewport-transform'

const CENTRE = { x: 7, y: -3 }
const VIEWPORT: ViewportValue = { centre: CENTRE, zoom: 4 }
const SIZE = { width: 648, height: 448 }

describe('modelToScreen', () => {
  it("puts the viewport's centre at the canvas centre", () => {
    expect(modelToScreen(CENTRE, VIEWPORT, SIZE)).toEqual({ x: 324, y: 224 })
  })

  it('maps a point up and right of the centre up and right on screen, by the zoom', () => {
    expect(modelToScreen({ x: CENTRE.x + 1, y: CENTRE.y + 1 }, VIEWPORT, SIZE)).toEqual({
      x: 328,
      y: 220,
    })
  })
})

describe('screenToModel', () => {
  it("puts the canvas centre at the viewport's centre", () => {
    expect(screenToModel({ x: 324, y: 224 }, VIEWPORT, SIZE)).toEqual(CENTRE)
  })

  it('maps a point up and right on screen up and right of the centre, by the zoom', () => {
    expect(screenToModel({ x: 328, y: 220 }, VIEWPORT, SIZE)).toEqual({
      x: CENTRE.x + 1,
      y: CENTRE.y + 1,
    })
  })
})
