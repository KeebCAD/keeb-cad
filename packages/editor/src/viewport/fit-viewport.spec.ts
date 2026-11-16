import { Result } from '@keeb-cad/result'
import { expectResult } from '@keeb-cad/result/testing'
import { aFreeGroup, aLayoutRow, anId, aPlacementId, aSlot } from '@keeb-cad/schema/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import { emulateColorScheme } from '../testing/color-scheme'
import { key } from '../testing/canvas-queries'
import { designOf, designWith } from '../testing/designs'
import { arrangeLayoutCanvas, sizeCanvasAndWait } from '../testing/layout-canvas'
import { keyAt, layoutOf } from '../testing/layout-rows'
import { nextFrames } from '../testing/next-frames'
import { press } from '../testing/press'
import { FitViewport } from './fit-viewport'
import type { ViewportValue } from './types'

const DIGITS = 6
const SIZE = { width: 648, height: 448 }
// Keys a at x 0 and b at x 40, each 18 mm square.
const TWO_KEYS = layoutOf({ a: keyAt(0), b: keyAt(40) })
// 448 px less 2 × 24 px of padding over the 18 mm key, centred on it.
const KEY_A_FITTED = { centre: { x: 0, y: 0 }, zoom: 400 / 18 }
// 648 px less 2 × 24 px over the 58 mm from a's left edge to b's right edge, centred between.
const KEYS_A_AND_B_FITTED = { centre: { x: 20, y: 0 }, zoom: 600 / 58 }
// With only a and b drawn, every slot on the canvas is a and b.
const EVERY_SLOT_FITTED = KEYS_A_AND_B_FITTED
const MOVED: ViewportValue = { centre: { x: -70, y: 30 }, zoom: 2 }
// Group `thumbfan` holding slots `thumbfan-near-home` and `thumbfan-far`, each posted on both sides.
const THUMBFAN = designOf([
  aFreeGroup({
    id: anId('thumbfan'),
    children: [aSlot({ id: anId('thumbfan-near-home') }), aSlot({ id: anId('thumbfan-far') })],
  }),
])
const THUMBFAN_GROUP = aLayoutRow({ kind: 'group', part: -1 })
// One key on each side, 120 mm apart: the right key alone at x 60, 18 mm square.
const RIGHT_KEY_FITTED = { centre: { x: 60, y: 0 }, zoom: 400 / 18 }
// The right group's keys at x 60 and 70: 600 px over the 28 mm from 51 to 79, centred between.
const RIGHT_GROUP_FITTED = { centre: { x: 65, y: 0 }, zoom: 600 / 28 }

async function arrange({
  design = designWith('a', 'b'),
  layout = TWO_KEYS,
  drawn = 'left/a',
} = {}) {
  const shell = await arrangeLayoutCanvas(design)
  await sizeCanvasAndWait(SIZE.width, SIZE.height)
  shell.post(layout)
  await expect.element(key(drawn)).toBeInTheDocument()
  await nextFrames()
  shell.viewport.setCentre(MOVED.centre)
  shell.viewport.setZoom(MOVED.zoom)
  return shell
}

function near({ centre, zoom }: ViewportValue) {
  return {
    centre: { x: expect.closeTo(centre.x, DIGITS), y: expect.closeTo(centre.y, DIGITS) },
    zoom: expect.closeTo(zoom, DIGITS),
  }
}

describe('F, fitting the viewport', () => {
  beforeEach(() => emulateColorScheme('dark'))

  it("fits a selected key's drawn bounds less the padding", async () => {
    const shell = await arrange()
    shell.selection.select([aPlacementId('left/a')])

    press('F')

    expect(shell.viewport.value).toEqual(near(KEY_A_FITTED))
  })

  it('fits every slot on the canvas with nothing selected', async () => {
    const shell = await arrange()

    press('F')

    expect(shell.viewport.value).toEqual(near(EVERY_SLOT_FITTED))
  })

  it('fits every slot on the canvas for a selection of an unplaced node only', async () => {
    const shell = await arrange({
      design: designWith('a', 'b', 'c'),
      layout: layoutOf({ a: keyAt(0), b: keyAt(40), c: aLayoutRow({ placed: false }) }),
    })
    shell.selection.select([aPlacementId('left/c')])

    press('F')

    expect(shell.viewport.value).toEqual(near(EVERY_SLOT_FITTED))
  })

  it("fits a selected group to its slots' drawn bounds", async () => {
    const group = aFreeGroup({
      id: anId('g'),
      children: [aSlot({ id: anId('a') }), aSlot({ id: anId('b') })],
    })
    const shell = await arrange({
      design: designOf([group, aSlot({ id: anId('c') })]),
      layout: layoutOf({
        g: aLayoutRow({ kind: 'group', part: -1 }),
        a: keyAt(0),
        b: keyAt(40),
        c: keyAt(200),
      }),
    })
    shell.selection.select([aPlacementId('left/g')])

    press('F')

    expect(shell.viewport.value).toEqual(near(KEYS_A_AND_B_FITTED))
  })

  it('fits every slot on the canvas for a selected empty group', async () => {
    const group = aFreeGroup({ id: anId('g') })
    const shell = await arrange({
      design: designOf([group, aSlot({ id: anId('a') }), aSlot({ id: anId('b') })]),
      layout: layoutOf({ g: aLayoutRow({ kind: 'group', part: -1 }), a: keyAt(0), b: keyAt(40) }),
    })
    shell.selection.select([aPlacementId('left/g')])

    press('F')

    expect(shell.viewport.value).toEqual(near(EVERY_SLOT_FITTED))
  })

  it('fits only the selected side of a key drawn on both halves', async () => {
    const shell = await arrange({
      design: THUMBFAN,
      layout: layoutOf({
        'left/thumbfan': THUMBFAN_GROUP,
        'right/thumbfan': THUMBFAN_GROUP,
        'left/thumbfan-near-home': keyAt(-60),
        'right/thumbfan-near-home': keyAt(60),
      }),
      drawn: 'right/thumbfan-near-home',
    })
    shell.selection.select([aPlacementId('right/thumbfan-near-home')])

    press('F')

    expect(shell.viewport.value).toEqual(near(RIGHT_KEY_FITTED))
  })

  it("fits a selected right group to its own side's keys", async () => {
    const shell = await arrange({
      design: THUMBFAN,
      layout: layoutOf({
        'left/thumbfan': THUMBFAN_GROUP,
        'right/thumbfan': THUMBFAN_GROUP,
        'left/thumbfan-near-home': keyAt(-60),
        'left/thumbfan-far': keyAt(-70),
        'right/thumbfan-near-home': keyAt(60),
        'right/thumbfan-far': keyAt(70),
      }),
      drawn: 'right/thumbfan-far',
    })
    shell.selection.select([aPlacementId('right/thumbfan')])

    press('F')

    expect(shell.viewport.value).toEqual(near(RIGHT_GROUP_FITTED))
  })

  it('fits every slot on the canvas for a selected id whose row is not posted yet', async () => {
    const shell = await arrange({ design: designWith('a', 'b', 'new') })
    shell.selection.select([aPlacementId('right/new')])

    press('F')

    expect(shell.viewport.value).toEqual(near(EVERY_SLOT_FITTED))
  })

  it('leaves the viewport for a canvas no larger than both paddings', async () => {
    const shell = await arrange()
    await sizeCanvasAndWait(48, 48)
    const before = shell.viewport.value

    press('F')

    expect(shell.viewport.value).toEqual(before)
  })

  it('is unavailable on Outline, leaving the viewport', async () => {
    const shell = await arrange()
    await shell.router.push({ name: 'outline', params: { id: 'corne' } })

    press('F')

    expectResult(
      shell.invoke.available(FitViewport),
      Result.err({ kind: 'unavailable', command: FitViewport.id }),
    )
    expect(shell.viewport.value).toEqual(MOVED)
  })

  it('is unavailable on Layout with no drawn key', async () => {
    const shell = await arrangeLayoutCanvas(designWith('a'))
    shell.post(layoutOf({ a: aLayoutRow({ placed: false }) }))
    await nextFrames()

    expectResult(
      shell.invoke.available(FitViewport),
      Result.err({ kind: 'unavailable', command: FitViewport.id }),
    )
  })
})
