import { aDesign } from '@keeb-cad/schema/testing'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { emulateColorScheme } from '../testing/color-scheme'
import {
  arrangeLayoutCanvas,
  canvasSvg,
  clientAt,
  designWith,
  key,
  keyAt,
  layoutOf,
  sizeCanvasAndWait,
} from '../testing/layout-canvas'
import { mountShell } from '../testing/mount-shell'
import { press } from '../testing/press'
import type { Point } from '../viewport/types'
import { Viewport } from '../viewport/viewport'
import { modelToScreen } from '../viewport/viewport-transform'

const SIZE = { width: 648, height: 448 }
const VIEW = { centre: { x: 0, y: 0 }, zoom: 4 }
const POINTED = { x: 12.34, y: -5.67 }
const OFF_CANVAS = 'x – y –'
const SCROLL_AT = modelToScreen(POINTED, VIEW, SIZE)

const cursor = () => page.getByRole('group', { name: 'Cursor' })
const zoom = () => page.getByRole('group', { name: 'Zoom' })

async function arrangeCanvas() {
  const shell = await arrangeLayoutCanvas(designWith('a'))
  await sizeCanvasAndWait(SIZE.width, SIZE.height)
  shell.post(layoutOf({ a: keyAt(0) }))
  await expect.element(key('a')).toBeInTheDocument()
  shell.viewport.setCentre(VIEW.centre)
  shell.viewport.setZoom(VIEW.zoom)
  return shell
}

function pointAt(type: 'pointerenter' | 'pointermove' | 'pointerleave', at: Point): void {
  const bubbles = type === 'pointermove'
  canvasSvg().dispatchEvent(
    new PointerEvent(type, { ...clientAt(at), pointerType: 'mouse', isPrimary: true, bubbles }),
  )
}

// As a browser does, the pointer enters the canvas before it moves over it.
function pointAtModel(point: Point): void {
  const at = modelToScreen(point, VIEW, SIZE)
  pointAt('pointerenter', at)
  pointAt('pointermove', at)
}

// The library ends a pointer move on a timer and emits once more then; a still pointer's move
// ended long before anything else happens.
function pointStillAtModel(point: Point): void {
  vi.useFakeTimers()
  pointAtModel(point)
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
}

// The browser's real pointer stays wherever an earlier spec's click left it, and a canvas mounted
// under it gets a real pointerenter; parking it in the top-left corner, over the top bar, keeps it
// off the canvas.
async function parkPointerOffCanvas(): Promise<void> {
  const corner = document.createElement('div')
  corner.style.cssText = 'position: fixed; left: 0; top: 0; width: 1px; height: 1px'
  document.body.append(corner)
  await userEvent.hover(page.elementLocator(corner))
  corner.remove()
}

describe('the status strip readouts', () => {
  beforeEach(() => emulateColorScheme('dark'))
  beforeEach(parkPointerOffCanvas)

  it('shows the zoom in the strip as it changes', async () => {
    const shell = await mountShell({ path: '/design/corne/layout', design: aDesign() })
    shell.injector.resolve(Viewport).setZoom(4)
    await expect.element(zoom()).toHaveTextContent('106%')

    shell.injector.resolve(Viewport).setZoom(96 / 25.4)

    await expect.element(zoom()).toHaveTextContent('100%')
  })

  describe('the cursor', () => {
    it('shows the model point under the pointer', async () => {
      await arrangeCanvas()

      pointAtModel(POINTED)

      await expect.element(cursor()).toHaveTextContent('x 12.34 y −5.67')
    })

    it('shows the model point now under a still pointer after a pan', async () => {
      await arrangeCanvas()
      pointAtModel(POINTED)
      await expect.element(cursor()).toHaveTextContent('x 12.34 y −5.67')

      // A trackpad scroll of 30 px right and 20 px up at 4 px per mm moves the centre 7.5 mm right
      // and 5 mm up.
      canvasSvg().dispatchEvent(
        new WheelEvent('wheel', { ...clientAt(SCROLL_AT), deltaX: 30, deltaY: -20, bubbles: true }),
      )

      await expect.element(cursor()).toHaveTextContent('x 19.84 y −0.67')
    })

    it('shows the model point now under a still pointer after the canvas resizes', async () => {
      await arrangeCanvas()
      pointStillAtModel(POINTED)
      await expect.element(cursor()).toHaveTextContent('x 12.34 y −5.67')

      // The canvas keeps its top left and the view its centre, so 80 px wider and 40 px taller at
      // 4 px per mm moves the model point under the pointer 10 mm left and 5 mm up.
      await sizeCanvasAndWait(SIZE.width + 80, SIZE.height + 40)

      await expect.element(cursor()).toHaveTextContent('x 2.34 y −0.67')
    })

    // Whole pixels, as layout rounds a fractional size, just short of the pointer.
    it.each<[string, (pointer: Point) => [number, number]]>([
      ['narrower', (pointer) => [Math.floor(pointer.x) - 1, SIZE.height]],
      ['shorter', (pointer) => [SIZE.width, Math.floor(pointer.y) - 1]],
    ])(
      'shows dashes once the canvas grows %s than a still pointer is from its corner',
      async (_side, shrunk) => {
        await arrangeCanvas()
        pointStillAtModel(POINTED)
        await expect.element(cursor()).toHaveTextContent('x 12.34 y −5.67')

        await sizeCanvasAndWait(...shrunk(modelToScreen(POINTED, VIEW, SIZE)))

        await expect.element(cursor()).toHaveTextContent(OFF_CANVAS)
      },
    )

    it('shows dashes once the canvas shrinks off the pointer before its move has ended', async () => {
      await arrangeCanvas()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      onTestFinished(() => {
        vi.useRealTimers()
      })
      pointAtModel(POINTED)
      await expect.element(cursor()).toHaveTextContent('x 12.34 y −5.67')
      const pointer = modelToScreen(POINTED, VIEW, SIZE)
      await sizeCanvasAndWait(Math.floor(pointer.x) - 1, SIZE.height)

      vi.runOnlyPendingTimers()

      await expect.element(cursor()).toHaveTextContent(OFF_CANVAS)
    })

    it('shows dashes before the pointer first enters the canvas', async () => {
      await arrangeCanvas()

      await expect.element(cursor()).toHaveTextContent(OFF_CANVAS)
    })

    it('shows dashes once the pointer leaves the canvas', async () => {
      await arrangeCanvas()
      pointAtModel(POINTED)
      await expect.element(cursor()).toHaveTextContent('x 12.34 y −5.67')

      pointAt('pointerleave', { x: -1, y: -1 })

      await expect.element(cursor()).toHaveTextContent(OFF_CANVAS)
    })

    it('shows dashes once the canvas unmounts under the pointer', async () => {
      await arrangeCanvas()
      pointAtModel(POINTED)
      await expect.element(cursor()).toHaveTextContent('x 12.34 y −5.67')

      press('2')

      await expect.element(cursor()).toHaveTextContent(OFF_CANVAS)
    })
  })
})
