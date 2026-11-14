import { AddSlot } from '@keeb-cad/commands'
import { expectOk } from '@keeb-cad/result/testing'
import type { Node } from '@keeb-cad/schema'
import {
  aBorder,
  aBorderRegion,
  aFreeGroup,
  aLayoutRow,
  anId,
  aSlot,
} from '@keeb-cad/schema/testing'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { nextTick } from 'vue'

import { emulateColorScheme } from '../testing/color-scheme'
import {
  arrangeLayoutCanvas,
  canvas,
  designOf,
  key,
  keyAt,
  layoutOf,
  nextFrames,
} from '../testing/layout-canvas'
import { press } from '../testing/press'
import type { LayoutRowOf } from '../testing/types'
import type { Point } from '../viewport/types'
import { switchGraceDelayMs } from '../workspace/layout/switch-grace-delay'

// Frappé's tokens.
const GROUP_BORDER = 'rgb(148, 156, 187)'
const SELECTION = 'rgb(202, 158, 230)'
const STALE = 'rgb(115, 121, 148)'
const CANVAS = 'rgb(65, 69, 89)'
const KEY_LEGEND = 'rgb(35, 38, 52)'
const TEXT = 'rgb(198, 208, 245)'
const GRACE_MS = 300
// Screen positions come from float transforms, so they agree to the nearest pixel, ±0.5 px.
const SCREEN_PX_DIGITS = 0

const NOTHING = { borders: [], tabs: [], origins: [] } as const

const hoveredBorder = (id: string, stroke = GROUP_BORDER) => ({
  name: `${id} border`,
  stroke,
  width: '1px',
  dashed: true,
})
const selectedBorder = (id: string) => ({
  name: `${id} border`,
  stroke: SELECTION,
  width: '2px',
  dashed: true,
})
const hoveredTab = (id: string) => ({
  name: id,
  text: `⠿ ${id}`,
  fill: CANVAS,
  edge: GROUP_BORDER,
  label: TEXT,
})
const selectedTab = (id: string) => ({
  name: id,
  text: `⠿ ${id}`,
  fill: SELECTION,
  edge: 'none',
  label: KEY_LEGEND,
})

const group = (id: string, children: Node[]) => aFreeGroup({ id: anId(id), children })
const slot = (id: string) => aSlot({ id: anId(id) })

// A counter-clockwise rectangle from its bottom-left to its top-right corner, in model mm.
function rectangle(left: number, bottom: number, right: number, top: number): Point[] {
  return [
    { x: left, y: bottom },
    { x: right, y: bottom },
    { x: right, y: top },
    { x: left, y: top },
  ]
}

function groupRow(outer: Point[], holes: Point[][] = []): LayoutRowOf {
  return aLayoutRow({ kind: 'group', part: -1, border: aBorder([aBorderRegion({ outer, holes })]) })
}

function emptyGroupRow(fields: Partial<LayoutRowOf> = {}): LayoutRowOf {
  return aLayoutRow({ kind: 'group', part: -1, border: aBorder([]), ...fields })
}

const HOVERED_C = {
  borders: [hoveredBorder('c')],
  tabs: [hoveredTab('c')],
  origins: [],
} as const

// Column c holds keys a and b side by side; its border runs 1 mm outside them.
const columnDesign = () => designOf([group('c', [slot('a'), slot('b')])])
const columnLayout = () =>
  layoutOf({ a: keyAt(0), b: keyAt(20), c: groupRow(rectangle(-10, -10, 30, 10)) })

function computedOf(element: Element): CSSStyleDeclaration {
  return getComputedStyle(element)
}

function named(element: Element): string {
  return element.getAttribute('aria-label') ?? ''
}

// Every border, tab and origin mark the canvas shows, in drawing order.
function drawn() {
  const images = canvas().getByRole('img').elements()
  const borders = images
    .filter((element) => named(element).endsWith(' border'))
    .map((element) => {
      const style = computedOf(element)
      return {
        name: named(element),
        stroke: style.stroke,
        width: style.strokeWidth,
        dashed: style.strokeDasharray !== 'none',
      }
    })
  const origins = images
    .filter((element) => named(element).endsWith(' origin'))
    .map((element) => ({ name: named(element), stroke: computedOf(element).stroke }))
  const tabs = canvas()
    .getByRole('button')
    .elements()
    .filter((element) => element.textContent.includes('⠿'))
    .map((element) => {
      const rect = element.querySelector('rect')
      const text = element.querySelector('text')
      if (rect === null || text === null) throw new Error('A tab draws a rect and a label.')
      return {
        name: named(element),
        text: text.textContent.trim(),
        fill: computedOf(rect).fill,
        edge: computedOf(rect).stroke,
        label: computedOf(text).fill,
      }
    })
  return { borders, tabs, origins }
}

// Where a model point is drawn, in client px, through the keys group the browser maps.
function clientOf({ x, y }: Point): Point {
  const keys = key('a').element().parentElement
  const matrix = keys instanceof SVGGElement ? keys.getScreenCTM() : null
  if (matrix === null) throw new Error('The keys are not rendered.')
  const point = new DOMPoint(x, y).matrixTransform(matrix)
  return { x: point.x, y: point.y }
}

// A model point as a position on the canvas locator, from its top left.
function onCanvas(point: Point): { position: Point } {
  const client = clientOf(point)
  const { left, top } = canvas().element().getBoundingClientRect()
  return { position: { x: client.x - left, y: client.y - top } }
}

// A point at the middle of the canvas's top edge, above every border and tab: the fit leaves the
// arranged rows' width, not their height, against the canvas edges.
function outsideEveryBorder(): { position: Point } {
  const { width } = canvas().element().getBoundingClientRect()
  return { position: { x: width / 2, y: 4 } }
}

// The centre of a group's ⊕ ring, in client px.
function originCentre(id: string): Point {
  const ring = canvas()
    .getByRole('img', { name: `${id} origin` })
    .element()
    .querySelector('circle')
  if (ring === null) throw new Error('The origin mark draws a ring.')
  const { left, top, width, height } = ring.getBoundingClientRect()
  return { x: left + width / 2, y: top + height / 2 }
}

const tab = (id: string) => canvas().getByRole('button', { name: id, exact: true })
const treeRow = (id: string) => page.getByRole('treeitem', { name: id, exact: true })

async function openTree(): Promise<void> {
  await page.getByRole('button', { name: 'Tree', exact: true }).click()
}

async function arrange(design = columnDesign(), layout = columnLayout()) {
  const shell = await arrangeLayoutCanvas(design)
  // The pointer stays where the last test left it, which may be where this test draws a key.
  await userEvent.hover(page.getByRole('contentinfo', { name: 'Status strip' }))
  shell.post(layout)
  await expect.element(key('a').first()).toBeInTheDocument()
  // The fit moves every point the pointer is aimed at, so it has run before the test aims.
  await nextFrames()
  return shell
}

function freezeTime() {
  vi.useFakeTimers()
  onTestFinished(() => {
    vi.useRealTimers()
  })
  return async (milliseconds: number) => {
    vi.advanceTimersByTime(milliseconds)
    await nextTick()
  }
}

describe('the group borders', () => {
  beforeEach(() => emulateColorScheme('dark'))

  describe('hover', () => {
    it('strokes no border and shows no tab at rest', async () => {
      await arrange()

      expect(drawn()).toEqual(NOTHING)
    })

    it("strokes a key's group 1px dashed and shows its tab while the pointer is over the key", async () => {
      await arrange()

      await userEvent.hover(key('a'))

      await expect.poll(drawn).toEqual(HOVERED_C)
    })

    it.each([
      ['still shows it just before the grace ends', GRACE_MS - 1, HOVERED_C],
      ['clears it when the grace ends', GRACE_MS, NOTHING],
      ['clears it just after the grace ends', GRACE_MS + 1, NOTHING],
    ])(
      'after the pointer leaves a key for empty space, %s',
      async (_role, milliseconds, expected) => {
        await arrange()
        await userEvent.hover(key('a'))
        await expect.poll(() => drawn().borders.length).toBe(1)
        const advance = freezeTime()

        await userEvent.hover(canvas(), outsideEveryBorder())
        await advance(milliseconds)

        expect(drawn()).toEqual(expected)
      },
    )

    it('keeps the group shown once the pointer reaches its tab within the grace', async () => {
      await arrange()
      await userEvent.hover(key('a'))
      await expect.poll(() => drawn().borders.length).toBe(1)
      const advance = freezeTime()

      await userEvent.hover(canvas(), outsideEveryBorder())
      await advance(100)
      await userEvent.hover(tab('c'))
      await advance(400)

      expect(drawn()).toEqual(HOVERED_C)
    })

    it("replaces the group at once when the pointer reaches another group's key within the grace", async () => {
      const design = designOf([group('c', [slot('a')]), group('d', [slot('k')])])
      const layout = layoutOf({
        a: keyAt(0),
        k: keyAt(40),
        c: groupRow(rectangle(-10, -10, 10, 10)),
        d: groupRow(rectangle(30, -10, 50, 10)),
      })
      await arrange(design, layout)
      await userEvent.hover(key('a'))
      await expect.poll(() => drawn().borders.length).toBe(1)
      const advance = freezeTime()

      await userEvent.hover(canvas(), outsideEveryBorder())
      await advance(100)
      await userEvent.hover(key('k'))

      expect(drawn()).toEqual({
        borders: [hoveredBorder('d')],
        tabs: [hoveredTab('d')],
        origins: [],
      })
    })

    it("strokes the innermost group's border for a pointer inside its line, off the keys", async () => {
      const { design, layout } = nested()
      await arrange(design, layout)

      await userEvent.hover(canvas(), onCanvas({ x: 10, y: 0 }))

      await expect.poll(drawn).toEqual(HOVERED_C)
    })

    it("strokes the outer group's border for a pointer inside its line and outside the inner one's", async () => {
      const { design, layout } = nested()
      await arrange(design, layout)

      await userEvent.hover(canvas(), onCanvas({ x: 10, y: 15 }))

      await expect
        .poll(drawn)
        .toEqual({ borders: [hoveredBorder('h')], tabs: [hoveredTab('h')], origins: [] })
    })

    it('strokes a group for a pointer inside a hole of its border, and a click there selects it', async () => {
      const { design, layout } = nested([rectangle(0, 12, 20, 18)])
      const shell = await arrange(design, layout)

      await userEvent.hover(canvas(), onCanvas({ x: 10, y: 15 }))
      await expect
        .poll(drawn)
        .toEqual({ borders: [hoveredBorder('h')], tabs: [hoveredTab('h')], origins: [] })
      await userEvent.click(canvas(), onCanvas({ x: 10, y: 15 }))

      expect(shell.selection.ids).toEqual(['h'])
    })

    it('strokes nothing for a key directly under the root', async () => {
      const design = designOf([group('c', [slot('a')]), slot('r')])
      const layout = layoutOf({
        a: keyAt(0),
        r: keyAt(40),
        c: groupRow(rectangle(-10, -10, 10, 10)),
      })
      await arrange(design, layout)

      await userEvent.hover(key('r'))
      await nextFrames()

      expect(drawn()).toEqual(NOTHING)
    })

    it("draws a group's border beneath a later group's key, so the key is what the pointer hits there", async () => {
      const design = designOf([group('c', [slot('a')]), group('d', [slot('k')])])
      const layout = layoutOf({
        a: keyAt(0),
        k: keyAt(18),
        c: groupRow(rectangle(-10, -10, 10, 10)),
        d: groupRow(rectangle(8, -10, 28, 10)),
      })
      await arrange(design, layout)

      const { x, y } = clientOf({ x: 10, y: 0 })
      const hit = document.elementFromPoint(x, y)

      expect(key('k').element().contains(hit)).toBe(true)
    })

    it("strokes both halves' borders and shows both tabs for a key on the left", async () => {
      const design = designOf([group('c', [slot('a')])])
      const layout = layoutOf({
        a: keyAt(0),
        c: groupRow(rectangle(-10, -10, 10, 10)),
        'right/a': keyAt(60),
        'right/c': groupRow(rectangle(50, -10, 70, 10)),
      })
      await arrange(design, layout)

      await userEvent.hover(key('a').first())

      await expect.poll(drawn).toEqual({
        borders: [hoveredBorder('c'), hoveredBorder('c')],
        tabs: [hoveredTab('c'), hoveredTab('c')],
        origins: [],
      })
    })

    it('strokes the border and tab in the stale colour while the switch grace grays the canvas', async () => {
      const shell = await arrange()
      await shell.router.push({ name: 'outline', params: { id: 'corne' } })
      expectOk(shell.store.run(AddSlot, {}))
      const advance = freezeTime()
      await shell.router.push({ name: 'layout', params: { id: 'corne' } })
      await advance(switchGraceDelayMs + 1)

      await userEvent.hover(key('a'))
      await nextTick()

      expect(drawn()).toEqual({
        borders: [hoveredBorder('c', STALE)],
        tabs: [{ ...hoveredTab('c'), edge: STALE, label: STALE }],
        origins: [],
      })
    })

    it('clears the hovered group across a switch to Outline and back', async () => {
      const shell = await arrange()
      await userEvent.hover(key('a'))
      await expect.poll(() => drawn().borders.length).toBe(1)

      await shell.router.push({ name: 'outline', params: { id: 'corne' } })
      await shell.router.push({ name: 'layout', params: { id: 'corne' } })

      await expect.element(key('a')).toBeInTheDocument()
      expect(drawn()).toEqual(NOTHING)
    })
  })

  describe('the Tree', () => {
    it("strokes a group's border while the pointer is over its row", async () => {
      await arrange()
      await openTree()

      await userEvent.hover(treeRow('c'))

      await expect.poll(drawn).toEqual(HOVERED_C)
    })

    it("strokes nothing while the pointer is over a slot's row", async () => {
      await arrange()
      await openTree()

      await userEvent.hover(treeRow('a'))
      await nextFrames()

      expect(drawn()).toEqual(NOTHING)
    })

    it.each([
      ['still shows it just before the grace ends', GRACE_MS - 1, HOVERED_C],
      ['clears it when the grace ends', GRACE_MS, NOTHING],
      ['clears it just after the grace ends', GRACE_MS + 1, NOTHING],
    ])(
      "after the pointer leaves a group's row and crosses slot rows, %s",
      async (_role, milliseconds, expected) => {
        await arrange()
        await openTree()
        await userEvent.hover(treeRow('c'))
        await expect.poll(() => drawn().borders.length).toBe(1)
        const advance = freezeTime()

        await userEvent.hover(treeRow('a'))
        await advance(200)
        await userEvent.hover(treeRow('b'))
        await advance(milliseconds - 200)

        expect(drawn()).toEqual(expected)
      },
    )

    it('clears the hovered group once the slide-out closes', async () => {
      await arrange()
      await openTree()
      await userEvent.hover(treeRow('c'))
      await expect.poll(() => drawn().borders.length).toBe(1)

      press('T')

      await expect.element(treeRow('c')).not.toBeInTheDocument()
      expect(drawn()).toEqual(NOTHING)
    })

    it("keeps a key's group shown when the slide-out closes under no Tree hover", async () => {
      await arrange()
      await openTree()
      // The open slide-out covers key a, so the pointer is on c's other key.
      await userEvent.hover(key('b'))
      await expect.poll(drawn).toEqual(HOVERED_C)
      const advance = freezeTime()

      press('T')
      await advance(GRACE_MS + 1)

      expect(treeRow('c').query()).toBeNull()
      expect(drawn()).toEqual(HOVERED_C)
    })

    it('clears a group its row set at once when the slide-out closes within the grace', async () => {
      await arrange()
      await openTree()
      await userEvent.hover(treeRow('c'))
      await expect.poll(() => drawn().borders.length).toBe(1)
      const advance = freezeTime()

      await userEvent.hover(canvas(), outsideEveryBorder())
      await advance(100)
      press('T')
      await advance(0)

      expect(treeRow('c').query()).toBeNull()
      expect(drawn()).toEqual(NOTHING)
    })
  })

  describe('selection', () => {
    it('selects the group on a click of its tab, in the canvas and the Tree', async () => {
      const shell = await arrange()
      await userEvent.hover(key('a'))

      await tab('c').click()
      await openTree()

      expect(shell.selection.ids).toEqual(['c'])
      await expect.element(treeRow('c')).toHaveAttribute('aria-selected', 'true')
      await expect
        .poll(drawn)
        .toEqual({ borders: [selectedBorder('c')], tabs: [selectedTab('c')], origins: [] })
    })

    it('selects the group on a click of empty space inside its line', async () => {
      const shell = await arrange()

      await userEvent.click(canvas(), onCanvas({ x: 10, y: 0 }))

      expect(shell.selection.ids).toEqual(['c'])
    })

    it('strokes only the selected group, not its ancestor', async () => {
      const { design, layout } = nested()
      const shell = await arrange(design, layout)

      shell.selection.select([anId('c')])

      await expect
        .poll(drawn)
        .toEqual({ borders: [selectedBorder('c')], tabs: [selectedTab('c')], origins: [] })
    })

    it("keeps the selected group's 2px border while a sibling group is hovered", async () => {
      const design = designOf([group('c', [slot('a')]), group('d', [slot('k')])])
      const layout = layoutOf({
        a: keyAt(0),
        k: keyAt(40),
        c: groupRow(rectangle(-10, -10, 10, 10)),
        d: groupRow(rectangle(30, -10, 50, 10)),
      })
      const shell = await arrange(design, layout)
      shell.selection.select([anId('c')])

      await userEvent.hover(key('k'))

      await expect.poll(drawn).toEqual({
        borders: [selectedBorder('c'), hoveredBorder('d')],
        tabs: [selectedTab('c'), hoveredTab('d')],
        origins: [],
      })
    })
  })

  describe('an empty group', () => {
    it('shows its origin mark at its frame and its tab while selected, and no border', async () => {
      const design = designOf([slot('a'), group('e', [])])
      const frame = { x: 40, y: 5, rot: 0, mirrored: false }
      const shell = await arrange(design, layoutOf({ a: keyAt(0), e: emptyGroupRow({ frame }) }))

      shell.selection.select([anId('e')])

      await expect.poll(drawn).toEqual({
        borders: [],
        tabs: [selectedTab('e')],
        origins: [{ name: 'e origin', stroke: SELECTION }],
      })
      const expected = clientOf(frame)
      expect(originCentre('e')).toEqual({
        x: expect.closeTo(expected.x, SCREEN_PX_DIGITS),
        y: expect.closeTo(expected.y, SCREEN_PX_DIGITS),
      })
    })

    it('shows no origin mark and no tab at rest', async () => {
      const design = designOf([slot('a'), group('e', [])])
      await arrange(
        design,
        layoutOf({
          a: keyAt(0),
          e: emptyGroupRow({ frame: { x: 40, y: 5, rot: 0, mirrored: false } }),
        }),
      )

      expect(drawn()).toEqual(NOTHING)
    })

    it('draws nothing for an unplaced group, selected', async () => {
      const design = designOf([slot('a'), group('e', [])])
      const shell = await arrange(
        design,
        layoutOf({ a: keyAt(0), e: emptyGroupRow({ placed: false }) }),
      )

      shell.selection.select([anId('e')])
      await nextTick()

      expect(drawn()).toEqual(NOTHING)
    })

    it('shows the origin mark and tab, no border, for a placed group whose only slot is unplaced', async () => {
      const design = designOf([slot('a'), group('u', [slot('x')])])
      // A design file loaded with an anchor cycle leaves its members, here x, unplaced.
      const layout = layoutOf({
        a: keyAt(0),
        u: emptyGroupRow({ frame: { x: 40, y: 5, rot: 0, mirrored: false } }),
        x: aLayoutRow({ placed: false }),
      })
      const shell = await arrange(design, layout)

      shell.selection.select([anId('u')])

      await expect.poll(drawn).toEqual({
        borders: [],
        tabs: [selectedTab('u')],
        origins: [{ name: 'u origin', stroke: SELECTION }],
      })
    })

    it('draws the border, no origin mark, for a group holding only a group with placed slots', async () => {
      const design = designOf([group('p', [group('c', [slot('a')])])])
      const layout = layoutOf({
        a: keyAt(0),
        c: groupRow(rectangle(-10, -10, 10, 10)),
        p: groupRow(rectangle(-11, -11, 11, 11)),
      })
      const shell = await arrange(design, layout)

      shell.selection.select([anId('p')])

      await expect
        .poll(drawn)
        .toEqual({ borders: [selectedBorder('p')], tabs: [selectedTab('p')], origins: [] })
    })
  })
})

// Group h holds column c (keys a and b) and key s; h's border reaches 10 mm above c's.
function nested(holes: Point[][] = []) {
  return {
    design: designOf([group('h', [group('c', [slot('a'), slot('b')]), slot('s')])]),
    layout: layoutOf({
      a: keyAt(0),
      b: keyAt(20),
      s: keyAt(40),
      c: groupRow(rectangle(-10, -10, 30, 10)),
      h: groupRow(rectangle(-11, -11, 51, 21), holes),
    }),
  }
}
