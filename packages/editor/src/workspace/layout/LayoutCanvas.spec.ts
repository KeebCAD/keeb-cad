import { AddSlot } from '@keeb-cad/commands'
import { expectOk } from '@keeb-cad/result/testing'
import {
  aDesign,
  aLayout,
  aLayoutRow,
  aMeta,
  anId,
  aPlacementId,
  aSlot,
} from '@keeb-cad/schema/testing'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { page } from 'vitest/browser'
import { nextTick } from 'vue'

import { emulateColorScheme } from '../../testing/color-scheme'
import {
  arrangeLayoutCanvas as arrange,
  canvas,
  designWith,
  key,
  layoutOf,
  nextFrames,
  sizeCanvasAndWait,
} from '../../testing/layout-canvas'
import { mountShell } from '../../testing/mount-shell'
import type { ViewportValue } from '../../viewport/types'
import type { Viewport } from '../../viewport/viewport'
import { switchGraceDelayMs } from './switch-grace-delay'

const HINT = 'Add a group (G) or open the command palette (Ctrl+K).'
const INITIAL_VIEWPORT = { centre: { x: 0, y: 0 }, zoom: 4 }
const DIGITS = 6
// Frappé's tokens.
const KEY_BODY = 'rgb(98, 104, 128)'
const SELECTION = 'rgb(202, 158, 230)'
const STALE = 'rgb(115, 121, 148)'
// DESIGN.md components.right-half.body-opacity.
const RIGHT_HALF_BODY_ALPHA = 0.7
const FULL_ALPHA = 1

const treeRow = (id: string) => page.getByRole('treeitem', { name: id, exact: true })

function expectNoKeyAndViewport(viewport: Viewport, expected: ViewportValue): void {
  expect({
    keys: canvas().getByRole('button').all().length,
    viewport: viewport.value,
  }).toEqual({ keys: 0, viewport: expected })
}

function twoKeys() {
  return layoutOf({
    a: aLayoutRow(),
    b: aLayoutRow({ frame: { x: 40, y: 0, rot: 0, mirrored: false } }),
  })
}

function keyElement(id: string): SVGGElement {
  return key(id).element() as SVGGElement
}

// The key's turn as drawn on screen, in degrees, positive clockwise as screen y points down.
function screenAngle(id: string): number {
  const matrix = keyElement(id).getScreenCTM()
  if (matrix === null) throw new Error('The key is not rendered.')
  return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI
}

// The key's own transform, in model mm, inside the viewport's group.
function ownTransform(id: string): DOMMatrix {
  const element = keyElement(id)
  const parent = element.parentNode as SVGGElement
  const own = element.getScreenCTM()
  const outer = parent.getScreenCTM()
  if (own === null || outer === null) throw new Error('The key is not rendered.')
  return DOMMatrix.fromMatrix(outer).inverse().multiply(DOMMatrix.fromMatrix(own))
}

// A computed colour's alpha: the `/ a` of a colour function, the fourth rgba value, or an opaque
// rgb; any other text is a colour this test cannot read.
function alphaOf(color: string): number {
  const slashed = /\/\s*([\d.]+)(%?)\s*\)$/.exec(color)
  if (slashed !== null) return Number(slashed[1]) / (slashed[2] === '%' ? 100 : 1)
  const rgba = /^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/.exec(color)
  if (rgba !== null) return Number(rgba[1])
  if (/^rgb\([^,/]+,[^,/]+,[^,/]+\)$/.test(color)) return FULL_ALPHA
  throw new Error(`Cannot read the alpha of "${color}".`)
}

// The alpha of a key's body and top-face fills and of its edge.
function keyAlphas(id: string) {
  const [body, topFace] = keyElement(id).querySelectorAll('rect')
  if (body === undefined || topFace === undefined) throw new Error('A fitted key draws two rects.')
  return {
    body: alphaOf(getComputedStyle(body).fill),
    topFace: alphaOf(getComputedStyle(topFace).fill),
    edge: alphaOf(getComputedStyle(body).stroke),
  }
}

// Slot k, drawn on both halves.
function bothHalves(fit: 'fitted' | 'empty' = 'fitted') {
  return layoutOf({
    k: aLayoutRow({ fit }),
    'right/k': aLayoutRow({ fit, frame: { x: 40, y: 0, rot: 0, mirrored: true } }),
  })
}

describe.each(['dark', 'light'] as const)('under the %s theme', (scheme) => {
  beforeEach(() => emulateColorScheme(scheme))
  describe('the Layout canvas', () => {
    it('shows the empty-design hint verbatim', async () => {
      await mountShell({ path: '/design/corne/layout' })

      await expect.element(canvas()).toHaveTextContent(HINT)
    })
  })
})

describe('the Layout canvas', () => {
  beforeEach(() => emulateColorScheme('dark'))

  describe('placing a key', () => {
    it.each([
      ['a counter-clockwise turn as a negative screen angle', 15, -15],
      ['a clockwise turn as a positive screen angle', -15, 15],
    ])('draws %s', async (_role, rot, expectedAngle) => {
      const shell = await arrange(designWith('a'))

      shell.post(layoutOf({ a: aLayoutRow({ frame: { x: 0, y: 0, rot, mirrored: false } }) }))

      await expect.element(key('left/a')).toBeInTheDocument()
      expect(screenAngle('left/a')).toBeCloseTo(expectedAngle, DIGITS)
    })

    it('draws a mirrored key with its x scaled by −1 at its frame', async () => {
      const shell = await arrange(designWith('a'))

      shell.post(layoutOf({ a: aLayoutRow({ frame: { x: 5, y: 7, rot: 0, mirrored: true } }) }))

      await expect.element(key('left/a')).toBeInTheDocument()
      const { a, b, c, d, e, f } = ownTransform('left/a')
      expect({ a, b, c, d, e, f }).toEqual({
        a: expect.closeTo(-1, DIGITS),
        b: expect.closeTo(0, DIGITS),
        c: expect.closeTo(0, DIGITS),
        d: expect.closeTo(1, DIGITS),
        e: expect.closeTo(5, DIGITS),
        f: expect.closeTo(7, DIGITS),
      })
    })

    it('draws only the placed row of a placed and an unplaced one', async () => {
      const shell = await arrange(designWith('a', 'b'))

      // No command posts an unplaced row until anchors land; the set is the one a loaded anchor cycle posts.
      shell.post(layoutOf({ a: aLayoutRow(), b: aLayoutRow({ placed: false }) }))

      await expect.element(key('left/a')).toBeInTheDocument()
      await expect.element(key('left/b')).not.toBeInTheDocument()
    })

    it.each([
      ['a fitted slot as a filled keycap', 'fitted', { fill: KEY_BODY, dashed: false }],
      ['an empty slot as a dashed outline', 'empty', { fill: 'none', dashed: true }],
      ['a stand-in slot as a dashed outline', 'stand-in', { fill: 'none', dashed: true }],
    ] as const)('draws %s', async (_role, fit, expected) => {
      const shell = await arrange(designWith('a'))

      shell.post(layoutOf({ a: aLayoutRow({ fit }) }))

      await expect.element(key('left/a')).toBeInTheDocument()
      const style = getComputedStyle(keyElement('left/a'))
      expect({ fill: style.fill, dashed: style.strokeDasharray !== 'none' }).toEqual(expected)
    })
  })

  describe('the new-design hint and the fit', () => {
    it('shows the hint for a set placing no slot, drawing no key and leaving the viewport', async () => {
      const shell = await arrange(designWith('a'))
      await sizeCanvasAndWait(648, 448)

      // No command posts an unplaced row until anchors land; the set is the one a loaded anchor cycle posts.
      shell.post(layoutOf({ a: aLayoutRow({ placed: false }) }))

      await expect.element(canvas()).toHaveTextContent(HINT)
      await nextFrames()
      expectNoKeyAndViewport(shell.viewport, INITIAL_VIEWPORT)
    })

    it('drops the hint and fits once a set draws a key', async () => {
      const shell = await arrange(designWith())
      shell.post(layoutOf({}))
      await expect.element(canvas()).toHaveTextContent(HINT)
      await sizeCanvasAndWait(648, 448)

      expectOk(shell.store.run(AddSlot, { id: 'a' }))
      await expect.element(canvas()).toHaveTextContent(HINT)
      shell.post(layoutOf({ a: aLayoutRow({ frame: { x: 30, y: 40, rot: 0, mirrored: false } }) }))

      // 448 px less 2 × 24 px of padding over the 18 mm key.
      const expectedZoom = 400 / 18
      await expect.element(key('left/a')).toBeInTheDocument()
      await expect.element(canvas()).not.toHaveTextContent(HINT)
      await expect.poll(() => shell.viewport.zoom).toBeCloseTo(expectedZoom, DIGITS)
      expect(shell.viewport.centre).toEqual({
        x: expect.closeTo(30, DIGITS),
        y: expect.closeTo(40, DIGITS),
      })
    })

    it('shows the hint before any set for a design with no slot', async () => {
      await arrange(designWith())

      await expect.element(canvas()).toHaveTextContent(HINT)
    })

    it('draws nothing, shows no hint and leaves the viewport at its initial value before any set for a design with slots', async () => {
      const shell = await arrange(designWith('a'))

      await sizeCanvasAndWait(648, 448)

      await expect.element(canvas()).not.toHaveTextContent(HINT)
      expectNoKeyAndViewport(shell.viewport, INITIAL_VIEWPORT)
    })

    it('keeps the viewport across a switch to Outline and back', async () => {
      const shell = await arrange(designWith('a'))
      shell.post(layoutOf({ a: aLayoutRow({ frame: { x: 30, y: 40, rot: 0, mirrored: false } }) }))
      await expect.poll(() => shell.viewport.centre.x).toBeCloseTo(30, DIGITS)
      shell.viewport.panBy({ x: 30, y: -20 })
      const moved = shell.viewport.value

      await shell.router.push({ name: 'outline', params: { id: 'corne' } })
      await shell.router.push({ name: 'layout', params: { id: 'corne' } })

      await expect.element(key('left/a')).toBeInTheDocument()
      await nextFrames()
      expect(shell.viewport.value).toEqual(moved)
    })

    it('fits the next design opened to its own keys', async () => {
      const shell = await arrange(designWith('a'))
      shell.post(layoutOf({ a: aLayoutRow({ frame: { x: -50, y: 0, rot: 0, mirrored: false } }) }))
      await expect.poll(() => shell.viewport.centre.x).toBeCloseTo(-50, DIGITS)
      const next = aDesign({
        meta: aMeta({ id: anId('lily58') }),
        layout: aLayout({ id: anId('root'), children: [aSlot({ id: anId('b') })] }),
      })

      shell.store.replaceDesign({ design: next, unreadable: [] })
      await shell.router.push({ name: 'layout', params: { id: 'lily58' } })
      shell.post(layoutOf({ b: aLayoutRow({ frame: { x: 100, y: 0, rot: 0, mirrored: false } }) }))

      await expect.poll(() => shell.viewport.centre.x).toBeCloseTo(100, DIGITS)
    })
  })

  describe('a design replaced before its set arrives', () => {
    it('draws no key of the previous set and no hint for a design with slots', async () => {
      const shell = await arrange(designWith('a'))
      shell.post(layoutOf({ a: aLayoutRow() }))
      await expect.element(key('left/a')).toBeInTheDocument()

      shell.store.replaceDesign({ design: designWith('b'), unreadable: [] })

      await expect.element(key('left/a')).not.toBeInTheDocument()
      await expect.element(canvas()).not.toHaveTextContent(HINT)
    })

    it('shows the hint for a design with no slot', async () => {
      const shell = await arrange(designWith('a'))
      shell.post(layoutOf({ a: aLayoutRow() }))
      await expect.element(key('left/a')).toBeInTheDocument()

      shell.store.replaceDesign({ design: designWith(), unreadable: [] })

      await expect.element(canvas()).toHaveTextContent(HINT)
      await expect.element(key('left/a')).not.toBeInTheDocument()
    })
  })

  describe('the right half', () => {
    it.each([
      ['dims an unselected right key', 'right/k', [], RIGHT_HALF_BODY_ALPHA],
      ['does not dim a selected right key', 'right/k', ['right/k'], FULL_ALPHA],
      ['does not dim an unselected left key', 'left/k', [], FULL_ALPHA],
    ])("%s's body and top face, keeping its edge", async (_role, id, selected, expectedFill) => {
      const shell = await arrange(designWith('k'))
      shell.post(bothHalves())
      await expect.element(key(id)).toBeInTheDocument()

      shell.selection.select(selected.map(aPlacementId))

      await expect
        .poll(() => keyAlphas(id))
        .toEqual({
          body: expectedFill,
          topFace: expectedFill,
          edge: FULL_ALPHA,
        })
    })

    it('fills an unselected right key in the opaque stale colour while the switch grace grays it', async () => {
      const shell = await arrange(designWith('k'))
      shell.post(bothHalves())
      await expect.element(key('right/k')).toBeInTheDocument()
      await shell.router.push({ name: 'outline', params: { id: 'corne' } })
      expectOk(shell.store.run(AddSlot, {}))
      vi.useFakeTimers()
      onTestFinished(() => {
        vi.useRealTimers()
      })
      await shell.router.push({ name: 'layout', params: { id: 'corne' } })
      vi.advanceTimersByTime(switchGraceDelayMs + 1)
      await nextTick()

      const [body] = keyElement('right/k').querySelectorAll('rect')
      expect(body === undefined ? undefined : getComputedStyle(body).fill).toBe(STALE)
    })

    it('draws an unfitted right key as an opaque dashed outline with no fill', async () => {
      const shell = await arrange(designWith('k'))

      shell.post(bothHalves('empty'))

      await expect.element(key('right/k')).toBeInTheDocument()
      const style = getComputedStyle(keyElement('right/k'))
      expect({
        fill: style.fill,
        dashed: style.strokeDasharray !== 'none',
        edge: alphaOf(style.stroke),
      }).toEqual({ fill: 'none', dashed: true, edge: FULL_ALPHA })
    })
  })

  describe('the selection', () => {
    it('selects a clicked key, and the tree shows that row selected', async () => {
      const shell = await arrange(designWith('a', 'b'))
      shell.post(twoKeys())

      await key('left/a').click()
      await page.getByRole('button', { name: 'Tree', exact: true }).click()

      expect(shell.selection.ids).toEqual([aPlacementId('left/a')])
      await expect.element(treeRow('a')).toHaveAttribute('aria-selected', 'true')
    })

    it('presses and outlines in the selection colour a key selected in the tree', async () => {
      const shell = await arrange(designWith('a', 'b'))
      shell.post(twoKeys())
      await page.getByRole('button', { name: 'Tree', exact: true }).click()

      await treeRow('a').click()

      expect(shell.selection.ids).toEqual([aPlacementId('left/a')])
      await expect.element(key('left/a')).toHaveAttribute('aria-pressed', 'true')
      expect(getComputedStyle(keyElement('left/a')).stroke).toBe(SELECTION)
    })
  })
})
