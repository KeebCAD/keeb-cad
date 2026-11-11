import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { page } from 'vitest/browser'

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
import { panBy } from './pan-by'
import type { Point, ViewportValue } from './types'
import { modelToScreen, screenToModel } from './viewport-transform'
import { zoomForPercent, zoomPercent } from './zoom-percent'

const SIZE = { width: 648, height: 448 }
const POINTER: Point = { x: 100, y: 80 }
// Empty canvas: the keys sit about the middle once fitted.
const EMPTY: Point = { x: 20, y: 20 }
const DRAG = { x: 30, y: -20 }
const DIGITS = 9
// One wheel notch (EXPERIENCE.md: ×1.1 per wheel notch).
const NOTCH = 1.1
const MOUSE_NOTCH_IN = -100
const MOUSE_NOTCH_OUT = 100
// A trackpad pinch step: fractional, so never notch-shaped.
const PINCH_OUT_STEP = -30.5
// The library scales a wheel pinch by 1 - deltaY / 100 per step (@use-gesture/core 10.3.1).
const PINCH_OUT_STEP_SCALE = 1.305

async function arrange() {
  const shell = await arrangeLayoutCanvas(designWith('a', 'b'))
  await sizeCanvasAndWait(SIZE.width, SIZE.height)
  shell.post(layoutOf({ a: keyAt(0), b: keyAt(40) }))
  await expect.element(key('a')).toBeInTheDocument()
  await expect.poll(() => shell.viewport.centre.x).toBeCloseTo(20, DIGITS)
  return shell
}

function wheel(at: Point, init: WheelEventInit): void {
  canvasSvg().dispatchEvent(
    new WheelEvent('wheel', { ...clientAt(at), bubbles: true, cancelable: true, ...init }),
  )
}

// The library ends a wheel gesture on a timer and emits once more then; tests that wheel let it
// end before asserting, as a person's next look at the screen always does.
function endingWheelGestures(): () => void {
  vi.useFakeTimers()
  onTestFinished(() => {
    vi.useRealTimers()
  })
  return () => vi.runOnlyPendingTimers()
}

// Returns false when a listener prevented the event's default.
function pointer(target: Element, type: string, at: Point, buttons: number): boolean {
  return target.dispatchEvent(
    new PointerEvent(type, {
      ...clientAt(at),
      buttons,
      button: buttons === 4 ? 1 : 0,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      bubbles: true,
      cancelable: true,
    }),
  )
}

// A drag as a mouse makes one, ending in the click a browser fires after a press and release.
function drag(target: Element, from: Point, by: Point, buttons: number): void {
  const to = { x: from.x + by.x, y: from.y + by.y }
  pointer(target, 'pointerdown', from, buttons)
  pointer(target, 'pointermove', to, buttons)
  pointer(target, 'pointerup', to, 0)
  if (buttons === 1)
    target.dispatchEvent(new MouseEvent('click', { ...clientAt(to), bubbles: true, detail: 1 }))
}

function space(type: 'keydown' | 'keyup'): void {
  const init = { key: ' ', code: 'Space', bubbles: true, cancelable: true }
  ;(document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent(type, init))
}

function holdSpace(): void {
  space('keydown')
}

function expectPointKept(before: ViewportValue, after: ViewportValue, at: Point): void {
  const fixed = screenToModel(at, before, SIZE)
  expect(screenToModel(at, after, SIZE)).toEqual({
    x: expect.closeTo(fixed.x, DIGITS),
    y: expect.closeTo(fixed.y, DIGITS),
  })
}

describe('the viewport controls on the Layout canvas', () => {
  beforeEach(() => emulateColorScheme('dark'))
  beforeEach(() => {
    ;(document.activeElement as HTMLElement | null)?.blur()
  })

  it('zooms in one wheel notch toward the pointer', async () => {
    const shell = await arrange()
    const before = shell.viewport.value
    const endWheelGesture = endingWheelGestures()

    wheel(POINTER, { deltaY: MOUSE_NOTCH_IN })
    endWheelGesture()

    expect(shell.viewport.zoom).toBeCloseTo(before.zoom * NOTCH, DIGITS)
    expectPointKept(before, shell.viewport.value, POINTER)
  })

  it('stops a pinch out past the maximum at the maximum, the pointer point kept', async () => {
    const shell = await arrange()
    shell.viewport.setZoom(zoomForPercent(1900))
    const before = shell.viewport.value
    const endWheelGesture = endingWheelGestures()

    wheel(POINTER, { deltaY: PINCH_OUT_STEP, ctrlKey: true })
    endWheelGesture()

    expect(zoomPercent(shell.viewport.zoom)).toBeCloseTo(2000, DIGITS)
    expectPointKept(before, shell.viewport.value, POINTER)
  })

  it.each<[string, number, number]>([
    ['in', MOUSE_NOTCH_IN, NOTCH],
    ['out', MOUSE_NOTCH_OUT, 1 / NOTCH],
  ])(
    'zooms %s one notch toward the pointer for a mouse notch with Ctrl held',
    async (_direction, deltaY, expectedFactor) => {
      const shell = await arrange()
      const before = shell.viewport.value
      const endWheelGesture = endingWheelGestures()

      wheel(POINTER, { deltaY, ctrlKey: true })
      endWheelGesture()

      expect(shell.viewport.zoom).toBeCloseTo(before.zoom * expectedFactor, DIGITS)
      expectPointKept(before, shell.viewport.value, POINTER)
    },
  )

  it('keeps a pinch step after a notch-shaped step in the same gesture at its own scale', async () => {
    const shell = await arrange()
    const before = shell.viewport.value
    const endWheelGesture = endingWheelGestures()

    wheel(POINTER, { deltaY: MOUSE_NOTCH_IN, ctrlKey: true })
    wheel(POINTER, { deltaY: PINCH_OUT_STEP, ctrlKey: true })
    endWheelGesture()

    expect(shell.viewport.zoom).toBeCloseTo(before.zoom * NOTCH * PINCH_OUT_STEP_SCALE, DIGITS)
  })

  it('pans by a middle-drag', async () => {
    const shell = await arrange()
    const before = shell.viewport.value

    drag(canvasSvg(), EMPTY, DRAG, 4)

    expect(shell.viewport.value).toEqual(panBy(before, DRAG))
  })

  it('prevents the default of the middle press that starts a pan', async () => {
    await arrange()

    const notPrevented = pointer(canvasSvg(), 'pointerdown', EMPTY, 4)
    pointer(canvasSvg(), 'pointerup', EMPTY, 0)

    expect(notPrevented).toBe(false)
  })

  it('pans by a left-drag on empty canvas with Space held', async () => {
    const shell = await arrange()
    const before = shell.viewport.value

    holdSpace()
    drag(canvasSvg(), EMPTY, DRAG, 1)
    space('keyup')

    expect(shell.viewport.value).toEqual(panBy(before, DRAG))
  })

  it('pans by a left-drag from a key with Space held, selecting nothing', async () => {
    const shell = await arrange()
    const before = shell.viewport.value
    const from = modelToScreen({ x: 0, y: 0 }, before, SIZE)

    holdSpace()
    drag(key('a').element(), from, DRAG, 1)
    space('keyup')

    expect({ viewport: shell.viewport.value, selection: shell.selection.ids }).toEqual({
      viewport: panBy(before, DRAG),
      selection: [],
    })
  })

  it('leaves the viewport on a left-drag on empty canvas without Space', async () => {
    const shell = await arrange()
    const before = shell.viewport.value

    drag(canvasSvg(), EMPTY, DRAG, 1)

    expect(shell.viewport.value).toEqual(before)
  })

  it('leaves the viewport on a left-drag with Space pressed while the tree has focus', async () => {
    const shell = await arrange()
    await page.getByRole('button', { name: 'Tree', exact: true }).click()
    await page.getByRole('treeitem', { name: 'a', exact: true }).click()
    const before = shell.viewport.value

    holdSpace()
    drag(canvasSvg(), EMPTY, DRAG, 1)
    space('keyup')

    expect(shell.viewport.value).toEqual(before)
  })
})
