import { aLayoutRow } from '@keeb-cad/schema/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import { emulateColorScheme } from '../testing/color-scheme'
import { canvas, key } from '../testing/canvas-queries'
import { designWith } from '../testing/designs'
import { arrangeLayoutCanvas } from '../testing/layout-canvas'
import { keyAt, layoutOf } from '../testing/layout-rows'
import { nextFrames } from '../testing/next-frames'
import type { LayoutRowOf } from '../testing/types'
import type { Point } from '../viewport/types'
import { zoomForPercent } from '../viewport/zoom-percent'

// Frappé's mirror-axis token.
const MIRROR_AXIS = 'rgb(148, 156, 187)'
// Screen positions come from float transforms, so they agree to the nearest pixel, ±0.5 px.
const SCREEN_PX_DIGITS = 0
// The minimum zoom (EXPERIENCE.md).
const MIN_ZOOM_PERCENT = 10

const axis = () => canvas().getByRole('img', { name: 'Mirror axis' })

const AT_ORIGIN: LayoutRowOf['frame'] = { x: 0, y: 0, rot: 0, mirrored: false }

function centerRow(frame = AT_ORIGIN) {
  return aLayoutRow({ kind: 'group', part: -1, frame })
}

// Center on both halves, and key a on the left so the canvas draws.
function bothHalves(frame?: LayoutRowOf['frame']) {
  return layoutOf({ 'left/root': centerRow(frame), 'right/root': centerRow(frame), a: keyAt(-40) })
}

async function arrange(layout = bothHalves()) {
  const shell = await arrangeLayoutCanvas(designWith('a'))
  shell.post(layout)
  await expect.element(key('left/a')).toBeInTheDocument()
  await nextFrames()
  return shell
}

// A model point on screen, in client px, through the keys group the browser maps.
function clientOf({ x, y }: Point): Point {
  const keys = key('left/a').element().parentElement
  const matrix = keys instanceof SVGGElement ? keys.getScreenCTM() : null
  if (matrix === null) throw new Error('The keys are not rendered.')
  const point = new DOMPoint(x, y).matrixTransform(matrix)
  return { x: point.x, y: point.y }
}

// The axis line's two ends, in client px, its stroke and whether it is dashed.
function drawnAxis() {
  const line = axis().element().querySelector('line')
  const matrix = line?.getScreenCTM() ?? null
  if (line === null || matrix === null) throw new Error('The axis draws one line.')
  const end = (x: SVGAnimatedLength, y: SVGAnimatedLength) => {
    const point = new DOMPoint(x.baseVal.value, y.baseVal.value).matrixTransform(matrix)
    return { x: point.x, y: point.y }
  }
  const style = getComputedStyle(line)
  return {
    from: end(line.x1, line.y1),
    to: end(line.x2, line.y2),
    stroke: style.stroke,
    dashed: style.strokeDasharray !== 'none',
  }
}

function near(value: number) {
  return expect.closeTo(value, SCREEN_PX_DIGITS)
}

// Whether the ends lie beyond the canvas's top and bottom edges, one on each side.
function spansCanvasHeight({ from, to }: { from: Point; to: Point }): boolean {
  const { top, bottom } = canvas().element().getBoundingClientRect()
  return Math.min(from.y, to.y) < top && Math.max(from.y, to.y) > bottom
}

describe('the mirror axis', () => {
  beforeEach(() => emulateColorScheme('dark'))

  it("draws one dashed line, vertical on screen through center's origin and past the canvas edges", async () => {
    await arrange()

    const drawn = drawnAxis()
    const origin = clientOf({ x: 0, y: 0 })
    expect({
      count: canvas().getByRole('img', { name: 'Mirror axis' }).all().length,
      stroke: drawn.stroke,
      dashed: drawn.dashed,
      xs: [drawn.from.x, drawn.to.x],
      spans: spansCanvasHeight(drawn),
    }).toEqual({
      count: 1,
      stroke: MIRROR_AXIS,
      dashed: true,
      xs: [near(origin.x), near(origin.x)],
      spans: true,
    })
  })

  it("turns with center's frame, horizontal on screen through its origin for a quarter turn", async () => {
    const at = { x: 10, y: 0 }
    await arrange(bothHalves({ ...at, rot: 90, mirrored: false }))

    const drawn = drawnAxis()
    const origin = clientOf(at)
    expect([drawn.from.y, drawn.to.y]).toEqual([near(origin.y), near(origin.y)])
  })

  it('is not drawn while only the left half is posted', async () => {
    await arrange(layoutOf({ 'left/root': centerRow(), a: keyAt(-40) }))

    await expect.element(axis()).not.toBeInTheDocument()
  })

  it('runs past the canvas top and bottom at the minimum zoom', async () => {
    const shell = await arrange()

    shell.viewport.setCentre({ x: 0, y: 0 })
    shell.viewport.setZoom(zoomForPercent(MIN_ZOOM_PERCENT))
    await nextFrames()

    expect(spansCanvasHeight(drawnAxis())).toBe(true)
  })
})
