import { AddSlot } from '@keeb-cad/commands'
import type { DesignStore } from '@keeb-cad/design'
import { expectOk } from '@keeb-cad/result/testing'
import { compareId, type Design, type LayoutOutput } from '@keeb-cad/schema'
import {
  aDesign,
  aLayout,
  aLayoutOutput,
  aLayoutRow,
  aMeta,
  anId,
  aPartsOutput,
  aSlot,
} from '@keeb-cad/schema/testing'
import type { FakeWorker } from '@keeb-cad/workers/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Selection } from '../../selection/selection'
import { emulateColorScheme } from '../../testing/color-scheme'
import { mountShell } from '../../testing/mount-shell'
import { postLayoutSet } from '../../testing/post-layout-set'
import type { ViewportValue } from '../../viewport/types'
import { Viewport } from '../../viewport/viewport'

const HINT = 'Add a group (G) or open the command palette (Ctrl+K).'
const INITIAL_VIEWPORT = { centre: { x: 0, y: 0 }, zoom: 4 }
const DIGITS = 6
const PARTS = aPartsOutput({ ids: ['key@a'], rows: [{ w: 18, h: 18 }] })
const ROOT_ROW = aLayoutRow({ kind: 'group', part: -1 })
// Frappé's tokens.
const KEY_BODY = 'rgb(98, 104, 128)'
const SELECTION = 'rgb(202, 158, 230)'

type Row = LayoutOutput['rows'][number]

function designWith(...slots: string[]): Design {
  return aDesign({
    layout: aLayout({ id: anId('root'), children: slots.map((id) => aSlot({ id: anId(id) })) }),
  })
}

// The root and the given slots, in the worker's id order.
function layoutOf(slots: Readonly<Record<string, Row>>): LayoutOutput {
  const rows = new Map<string, Row>([
    ['left/root', ROOT_ROW],
    ...Object.entries(slots).map(([id, row]): [string, Row] => [`left/${id}`, row]),
  ])
  const ids = [...rows.keys()].toSorted(compareId)
  return aLayoutOutput({ ids, rows: ids.map((id) => rows.get(id) ?? ROOT_ROW) })
}

function seqOf(store: DesignStore): number {
  return store.current.map(({ seq }) => seq).getOr(-1)
}

function only(spawned: FakeWorker[]): FakeWorker {
  const [worker] = spawned
  if (worker === undefined) throw new Error('Expected a spawned worker.')
  return worker
}

async function arrange(design: Design) {
  const shell = await mountShell({ path: '/design/corne/layout', design, spawn: true })
  const worker = only(shell.spawned)
  return {
    ...shell,
    viewport: shell.injector.resolve(Viewport),
    selection: shell.injector.resolve(Selection),
    post: (layout: LayoutOutput) => {
      postLayoutSet(worker, { seq: seqOf(shell.store), layout, parts: PARTS })
    },
  }
}

const canvas = () => page.getByRole('main', { name: 'Canvas' })
const key = (id: string) => page.getByRole('button', { name: id, exact: true })
const treeRow = (id: string) => page.getByRole('treeitem', { name: id, exact: true })

function svg(): SVGSVGElement {
  const found = canvas().element().querySelector('svg')
  if (found === null) throw new Error('The canvas drew no SVG.')
  return found
}

function sizeCanvas(width: number, height: number): void {
  svg().style.width = `${width}px`
  svg().style.height = `${height}px`
}

function svgSize() {
  const { width, height } = svg().getBoundingClientRect()
  return { width, height }
}

async function sizeCanvasAndWait(width: number, height: number): Promise<void> {
  sizeCanvas(width, height)
  await expect.poll(() => svgSize()).toEqual({ width, height })
  await nextFrames()
}

function expectNoKeyAndViewport(viewport: Viewport, expected: ViewportValue): void {
  expect({
    keys: canvas().getByRole('button').all().length,
    viewport: viewport.value,
  }).toEqual({ keys: 0, viewport: expected })
}

function twoKeys(): LayoutOutput {
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

// A frame's resize observations come after its animation frame callbacks, so two frames see the
// remounted canvas measured and any fit it would run.
async function nextFrames(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
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

      await expect.element(key('a')).toBeInTheDocument()
      expect(screenAngle('a')).toBeCloseTo(expectedAngle, DIGITS)
    })

    it('draws a mirrored key with its x scaled by −1 at its frame', async () => {
      const shell = await arrange(designWith('a'))

      shell.post(layoutOf({ a: aLayoutRow({ frame: { x: 5, y: 7, rot: 0, mirrored: true } }) }))

      await expect.element(key('a')).toBeInTheDocument()
      const { a, b, c, d, e, f } = ownTransform('a')
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

      await expect.element(key('a')).toBeInTheDocument()
      await expect.element(key('b')).not.toBeInTheDocument()
    })

    it.each([
      ['a fitted slot as a filled keycap', 'fitted', { fill: KEY_BODY, dashed: false }],
      ['an empty slot as a dashed outline', 'empty', { fill: 'none', dashed: true }],
      ['a stand-in slot as a dashed outline', 'stand-in', { fill: 'none', dashed: true }],
    ] as const)('draws %s', async (_role, fit, expected) => {
      const shell = await arrange(designWith('a'))

      shell.post(layoutOf({ a: aLayoutRow({ fit }) }))

      await expect.element(key('a')).toBeInTheDocument()
      const style = getComputedStyle(keyElement('a'))
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
      await expect.element(key('a')).toBeInTheDocument()
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
      const moved: ViewportValue = { centre: { x: -7, y: 12 }, zoom: 1 }
      shell.viewport.setCentre(moved.centre)
      shell.viewport.setZoom(moved.zoom)

      await shell.router.push({ name: 'outline', params: { id: 'corne' } })
      await shell.router.push({ name: 'layout', params: { id: 'corne' } })

      await expect.element(key('a')).toBeInTheDocument()
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
      await expect.element(key('a')).toBeInTheDocument()

      shell.store.replaceDesign({ design: designWith('b'), unreadable: [] })

      await expect.element(key('a')).not.toBeInTheDocument()
      await expect.element(canvas()).not.toHaveTextContent(HINT)
    })

    it('shows the hint for a design with no slot', async () => {
      const shell = await arrange(designWith('a'))
      shell.post(layoutOf({ a: aLayoutRow() }))
      await expect.element(key('a')).toBeInTheDocument()

      shell.store.replaceDesign({ design: designWith(), unreadable: [] })

      await expect.element(canvas()).toHaveTextContent(HINT)
      await expect.element(key('a')).not.toBeInTheDocument()
    })
  })

  describe('the selection', () => {
    it('selects a clicked key, and the tree shows that row selected', async () => {
      const shell = await arrange(designWith('a', 'b'))
      shell.post(twoKeys())

      await key('a').click()
      await page.getByRole('button', { name: 'Tree', exact: true }).click()

      expect(shell.selection.ids).toEqual(['a'])
      await expect.element(treeRow('a')).toHaveAttribute('aria-selected', 'true')
    })

    it('presses and outlines in the selection colour a key selected in the tree', async () => {
      const shell = await arrange(designWith('a', 'b'))
      shell.post(twoKeys())
      await page.getByRole('button', { name: 'Tree', exact: true }).click()

      await treeRow('a').click()

      expect(shell.selection.ids).toEqual(['a'])
      await expect.element(key('a')).toHaveAttribute('aria-pressed', 'true')
      expect(getComputedStyle(keyElement('a')).stroke).toBe(SELECTION)
    })
  })
})
