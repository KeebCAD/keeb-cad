import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign, aMeta, anId } from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { nextTick } from 'vue'

import { CanvasItems } from './canvas-items'
import { panBy } from './pan-by'
import type { Bounds, CanvasSize, ViewportValue } from './types'
import { Viewport } from './viewport'
import { zoomForPercent, zoomPercent } from './zoom-percent'

const A = 'viewport-spec-a'
const B = 'viewport-spec-b'
const CANVAS: CanvasSize = { width: 648, height: 448 }
const ONE_KEY: Bounds = { x: -9, y: -9, width: 18, height: 18 }
// 448 px less 2 × 24 px of padding over the 18 mm key, centred on it.
const ONE_KEY_FITTED: ViewportValue = { centre: { x: 0, y: 0 }, zoom: 400 / 18 }
const STORED_CENTRE = { x: 1, y: 2 }
const PAN = { x: 30, y: -20 }

function keyOf(designId: string): string {
  return `keeb-cad.viewport.${designId}`
}

// A write's own storage event pauses VueUse's write watch until the tick after it, so a test that
// writes again at once waits that tick out first, as a person's next input always does.
async function writeSettled(): Promise<void> {
  await nextTick()
  await nextTick()
}

function stored(designId: string): unknown {
  const raw = localStorage.getItem(keyOf(designId))
  return raw === null ? undefined : JSON.parse(raw)
}

async function arrange(storage: Readonly<Record<string, string>> = {}) {
  localStorage.clear()
  for (const [designId, raw] of Object.entries(storage)) localStorage.setItem(keyOf(designId), raw)
  const container = new Container().addModule(designModule)
  container.register(CanvasItems).useClass(CanvasItems)
  container.register(Viewport).useClass(Viewport)
  onTestFinished(async () => {
    await container.dispose()
    localStorage.clear()
  })
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  return {
    container,
    viewport: container.resolve(Viewport),
    open: (designId: string) => {
      const design = aDesign({ meta: aMeta({ id: anId(designId) }) })
      expectOk(store.replaceDesign({ design, unreadable: [] }))
    },
  }
}

describe('Viewport', () => {
  it('opens at its initial value with no design open, writing nothing on a change', async () => {
    const { viewport } = await arrange()

    viewport.panBy(PAN)
    await nextTick()

    expect({ value: viewport.value, written: localStorage.length }).toEqual({
      value: { centre: { x: -7.5, y: -5 }, zoom: 4 },
      written: 0,
    })
  })

  describe('a stored zoom', () => {
    it.each([
      ['just below the minimum is refused, and the design fits', 9.999, ONE_KEY_FITTED],
      ['on the minimum is used', 10, { centre: STORED_CENTRE, zoom: zoomForPercent(10) }],
      ['on the maximum is used', 2000, { centre: STORED_CENTRE, zoom: zoomForPercent(2000) }],
      ['just above the maximum is refused, and the design fits', 2000.001, ONE_KEY_FITTED],
    ])('%s', async (_role, percent, expected) => {
      const raw = JSON.stringify({ centre: STORED_CENTRE, zoom: zoomForPercent(percent) })
      const { viewport, open } = await arrange({ [A]: raw })

      open(A)
      viewport.fitOnce(ONE_KEY, CANVAS)

      expect(viewport.value).toEqual(expected)
    })
  })

  describe('a fit', () => {
    // A square of this side fits the 648 × 448 canvas at the percent: 448 px less 2 × 24 px over it.
    const squareFittingAt = (percent: number): Bounds => {
      const side = 400 / zoomForPercent(percent)
      return { x: -side / 2, y: -side / 2, width: side, height: side }
    }

    it.each([
      ['just below the minimum', 9.9, 10],
      ['on the minimum', 10, 10],
      ['just above the minimum', 10.1, 10.1],
      ['just below the maximum', 1999, 1999],
      ['on the maximum', 2000, 2000],
      ['just above the maximum', 2001, 2000],
    ])('clamps a fitted zoom %s', async (_role, fittedPercent, expectedPercent) => {
      const { viewport, open } = await arrange()

      open(A)
      viewport.fitOnce(squareFittingAt(fittedPercent), CANVAS)

      expect(zoomPercent(viewport.zoom)).toBeCloseTo(expectedPercent, 9)
    })
  })

  it.each([
    ['that is no JSON', '{'],
    ['of the wrong shape', JSON.stringify({ centre: { x: 1 }, zoom: 4 })],
  ])('fits over a stored value %s, writing the fit', async (_role, raw) => {
    const { viewport, open } = await arrange({ [A]: raw })

    open(A)
    viewport.fitOnce(ONE_KEY, CANVAS)
    await nextTick()

    expect({ value: viewport.value, stored: stored(A) }).toEqual({
      value: ONE_KEY_FITTED,
      stored: ONE_KEY_FITTED,
    })
  })

  it('opens a design at its stored value and leaves the opening fit undone', async () => {
    const value: ViewportValue = { centre: STORED_CENTRE, zoom: 3 }
    const { viewport, open } = await arrange({ [A]: JSON.stringify(value) })

    open(A)
    viewport.fitOnce(ONE_KEY, CANVAS)

    expect(viewport.value).toEqual(value)
  })

  it('fits a design with nothing stored, then reopens a panned one at its pan', async () => {
    const { viewport, open } = await arrange()
    open(A)
    viewport.fitOnce(ONE_KEY, CANVAS)
    viewport.panBy(PAN)

    open(B)
    viewport.fitOnce({ ...ONE_KEY, x: 91 }, CANVAS)
    const other = viewport.value
    open(A)

    expect({ other, reopened: viewport.value }).toEqual({
      other: { ...ONE_KEY_FITTED, centre: { x: 100, y: 0 } },
      reopened: panBy(ONE_KEY_FITTED, PAN),
    })
  })

  it('writes nothing for a fit the canvas is too small for, and fits after a reload', async () => {
    const first = await arrange()
    first.open(A)
    first.viewport.fitOnce(ONE_KEY, { width: 48, height: 448 })
    await nextTick()
    const written = stored(A)
    await first.container.dispose()

    const reloaded = await arrange()
    reloaded.open(A)
    reloaded.viewport.fitOnce(ONE_KEY, CANVAS)

    expect({ written, value: reloaded.viewport.value }).toEqual({
      written: undefined,
      value: ONE_KEY_FITTED,
    })
  })

  describe('writing to storage', () => {
    it('writes a pan at once and the next one on the write interval', async () => {
      vi.useFakeTimers()
      onTestFinished(() => {
        vi.useRealTimers()
      })
      const { viewport, open } = await arrange()
      open(A)
      viewport.panBy(PAN)
      await nextTick()
      vi.advanceTimersByTime(100)
      viewport.panBy(PAN)
      await nextTick()

      vi.advanceTimersByTime(149)
      const before = stored(A)
      vi.advanceTimersByTime(1)

      expect({ before, after: stored(A) }).toEqual({
        before: panBy(Viewport.initial, PAN),
        after: panBy(panBy(Viewport.initial, PAN), PAN),
      })
    })

    it('writes a pending pan under its design when another design opens', async () => {
      const { viewport, open } = await arrange()
      open(A)
      viewport.panBy(PAN)
      await writeSettled()
      viewport.panBy(PAN)

      open(B)

      expect(stored(A)).toEqual(panBy(panBy(Viewport.initial, PAN), PAN))
    })

    it('writes a pending pan when it is disposed', async () => {
      const { container, viewport, open } = await arrange()
      open(A)
      viewport.panBy(PAN)
      await writeSettled()
      viewport.panBy(PAN)

      await container.dispose()

      expect(stored(A)).toEqual(panBy(panBy(Viewport.initial, PAN), PAN))
    })
  })
})
