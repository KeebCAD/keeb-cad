import { aLayoutRow, aPartsOutput, aSlotSpace } from '@keeb-cad/schema/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { emulateColorScheme } from '../../testing/color-scheme'
import {
  arrangeIdsAndLinks,
  drawnIdsAndLinks as drawn,
  idLabel,
  linkEnds,
  screenOf,
} from '../../testing/ids-and-links'
import { key } from '../../testing/canvas-queries'
import { designWith } from '../../testing/designs'
import { layoutOf } from '../../testing/layout-rows'
import { matrixAndThumbfan } from '../../testing/matrix-and-thumbfan'
import type { Point } from '../../viewport/types'

// The gap between the key's lowest point and the label's top.
const LABEL_GAP_PX = 3
// Browser-measured boxes come from float transforms, so they agree to the nearest pixel, ±0.5 px.
const MEASURED_PX_DIGITS = 0
// Link ends are written as attributes from the same floats, so they agree far below a pixel.
const SCREEN_PX_DIGITS = 6

function near({ x, y }: Point, digits: number) {
  return { x: expect.closeTo(x, digits), y: expect.closeTo(y, digits) }
}

// An element's drawn box in client px, without its stroke, which Firefox counts in a bounding client
// rect and Chromium does not.
function drawnBox(element: SVGGraphicsElement | null) {
  const matrix = element?.getScreenCTM() ?? null
  if (element === null || matrix === null) throw new Error('Expected a drawn rect.')
  const { x, y, width, height } = element.getBBox()
  const corners = [
    new DOMPoint(x, y),
    new DOMPoint(x + width, y),
    new DOMPoint(x, y + height),
    new DOMPoint(x + width, y + height),
  ].map((corner) => corner.matrixTransform(matrix))
  const xs = corners.map((corner) => corner.x)
  const ys = corners.map((corner) => corner.y)
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  }
}

// The label's middle and top, in client px.
function labelTopMiddle(placement: string): Point {
  const { left, right, top } = drawnBox(idLabel(placement).element().querySelector('rect'))
  return { x: (left + right) / 2, y: top }
}

// The key's middle and lowest point as the browser drew it, in client px.
function keyBottomMiddle(placement: string): Point {
  const { left, right, bottom } = drawnBox(key(placement).element().querySelector('path'))
  return { x: (left + right) / 2, y: bottom }
}

// The label's width follows its text once measured, so its middle settles a frame later.
async function expectLabelUnderKey(placement: string): Promise<void> {
  const under = keyBottomMiddle(placement)
  await expect
    .poll(() => labelTopMiddle(placement))
    .toEqual(near({ x: under.x, y: under.y + LABEL_GAP_PX }, MEASURED_PX_DIGITS))
}

describe("a pointed slot's id label", () => {
  beforeEach(() => emulateColorScheme('dark'))

  it("reads the id, centred under the key, with the link from the anchor point to the frame and its group's border", async () => {
    const { design, layout } = matrixAndThumbfan()
    await arrangeIdsAndLinks(design, layout)

    await userEvent.hover(key('left/matrix-middle-top'))

    await expect.poll(drawn).toEqual({
      labels: ['left/matrix-middle-top id'],
      links: ['left/matrix-middle-top anchor link'],
      borders: ['left/matrix-middle border'],
    })
    expect(idLabel('left/matrix-middle-top').element().textContent.trim()).toBe('matrix-middle-top')
    await expectLabelUnderKey('left/matrix-middle-top')
    expect(linkEnds('left/matrix-middle-top')).toEqual({
      from: near(screenOf({ x: 0, y: 9.5 }), SCREEN_PX_DIGITS),
      to: near(screenOf({ x: 0, y: 19 }), SCREEN_PX_DIGITS),
    })
  })

  it.each([0, 30, 90])(
    'sits under the lowest drawn point of a 1.5u key turned %i°',
    async (rot) => {
      const wideKey = aSlotSpace({ width: 27 })
      await arrangeIdsAndLinks(
        designWith('k'),
        layoutOf({ k: aLayoutRow({ frame: { x: 0, y: 0, rot, mirrored: false } }) }),
        aPartsOutput({ ids: ['key@a'], rows: [wideKey] }),
      )

      await userEvent.hover(key('left/k'))

      await expect.poll(() => drawn().labels).toEqual(['left/k id'])
      await expectLabelUnderKey('left/k')
    },
  )
})
