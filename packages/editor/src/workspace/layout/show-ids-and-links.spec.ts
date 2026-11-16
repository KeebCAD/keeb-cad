import { AddSlot, DeleteNode } from '@keeb-cad/commands'
import { expectOk } from '@keeb-cad/result/testing'
import { aFreeGroup, aLayoutRow, anId, aPlacementId, aSlot } from '@keeb-cad/schema/testing'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { nextTick } from 'vue'

import { emulateColorScheme } from '../../testing/color-scheme'
import {
  anchorLink,
  anchorLinkLine,
  arrangeIdsAndLinks,
  drawnIdsAndLinks as drawn,
  idLabel,
  linkEnds,
  onCanvas,
  screenOf,
  statusStrip,
} from '../../testing/ids-and-links'
import { canvas, canvasSvg, key } from '../../testing/canvas-queries'
import { designOf, designWith } from '../../testing/designs'
import { groupRow, keyAt, layoutOf, rectangle } from '../../testing/layout-rows'
import { nextFrames } from '../../testing/next-frames'
import { matrixAndThumbfan } from '../../testing/matrix-and-thumbfan'
import type { Point } from '../../viewport/types'

// EXPERIENCE.md's hover grace and the spine's Switch grace.
const HOVER_GRACE_MS = 300
const SWITCH_GRACE_MS = 200
// Screen points are written as attributes from the same floats, so they agree far below a pixel.
const SCREEN_PX_DIGITS = 6
const NOTHING = { labels: [], links: [], borders: [] } as const
const THEMES = {
  // Frappé's and Latte's panel, key-edge and text tokens.
  dark: { fill: 'rgb(48, 52, 70)', stroke: 'rgb(148, 156, 187)', text: 'rgb(198, 208, 245)' },
  light: { fill: 'rgb(239, 241, 245)', stroke: 'rgb(124, 127, 147)', text: 'rgb(76, 79, 105)' },
} as const
// Frappé's panel and stale tokens.
const PANEL = 'rgb(48, 52, 70)'
const STALE = 'rgb(115, 121, 148)'
const CANVAS_LABEL_PX = '11px'

const tab = (id: string) => canvas().getByRole('button', { name: id, exact: true })
const treeRow = (id: string) => page.getByRole('treeitem', { name: id, exact: true })

// Inside thumbfan's border, 2 mm above its keys.
const INSIDE_THUMBFAN: Point = { x: 20, y: -14 }

function shows(placement: string) {
  return { labels: [`${placement} id`], links: [`${placement} anchor link`] }
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

function near({ x, y }: Point) {
  return { x: expect.closeTo(x, SCREEN_PX_DIGITS), y: expect.closeTo(y, SCREEN_PX_DIGITS) }
}

async function arrangeT() {
  const { design, layout } = matrixAndThumbfan()
  return arrangeIdsAndLinks(design, layout)
}

// Key k alone, directly under the root.
async function arrangeK(row = keyAt(0)) {
  return arrangeIdsAndLinks(designWith('k'), layoutOf({ k: row }))
}

// An unfitted key draws no fill, so only its 1px edge catches the pointer, finer than a scaled test
// frame aims; the browser sends the key what reaching its edge would.
function pointAtEdge(placement: string): void {
  key(placement)
    .element()
    .dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse', isPrimary: true }))
}

function labelStyle(placement: string) {
  const label = idLabel(placement).element()
  const rect = label.querySelector('rect')
  const text = label.querySelector('text')
  if (rect === null || text === null) throw new Error('A label draws a rect and its text.')
  const rectStyle = getComputedStyle(rect)
  const textStyle = getComputedStyle(text)
  return {
    fill: rectStyle.fill,
    stroke: rectStyle.stroke,
    strokeWidth: rectStyle.strokeWidth,
    text: textStyle.fill,
    fontSize: textStyle.fontSize,
    fontFamily: textStyle.fontFamily,
  }
}

function labelText(placement: string): string {
  return idLabel(placement).element().textContent.trim()
}

describe('the ids and anchor links on the Layout canvas', () => {
  beforeEach(() => emulateColorScheme('dark'))

  describe('at rest', () => {
    it('draws no id label, no anchor link and no text', async () => {
      await arrangeT()

      const texts = [...canvasSvg().querySelectorAll('text')].map((text) => text.textContent)
      expect({ ...drawn(), texts }).toEqual({ ...NOTHING, texts: [] })
    })
  })

  describe('a pointed key', () => {
    it("shows its own label and link and its innermost group's border", async () => {
      await arrangeT()

      await userEvent.hover(key('left/thumbfan-near-home'))

      await expect.poll(drawn).toEqual({
        ...shows('left/thumbfan-near-home'),
        borders: ['left/thumbfan border'],
      })
    })

    it('shows a key directly under the root its label and link and no border', async () => {
      await arrangeK()

      await userEvent.hover(key('left/k'))

      await expect.poll(drawn).toEqual({ ...shows('left/k'), borders: [] })
    })

    it('reads the authored id on the right half, with only the right border', async () => {
      await arrangeT()

      await userEvent.hover(key('right/thumbfan-near-home'))

      await expect.poll(drawn).toEqual({
        ...shows('right/thumbfan-near-home'),
        borders: ['right/thumbfan border'],
      })
      expect(labelText('right/thumbfan-near-home')).toBe('thumbfan-near-home')
    })

    it.each(['empty', 'stand-in'] as const)(
      'labels an unfitted slot whose fit is %s',
      async (fit) => {
        await arrangeK(aLayoutRow({ fit }))

        pointAtEdge('left/k')

        await expect.poll(drawn).toEqual({ ...shows('left/k'), borders: [] })
      },
    )

    it.each([
      ['still shows them just before the grace ends', HOVER_GRACE_MS - 1, shows('left/k')],
      ['clears them when the grace ends', HOVER_GRACE_MS, { labels: [], links: [] }],
      ['clears them just after the grace ends', HOVER_GRACE_MS + 1, { labels: [], links: [] }],
    ])('after the pointer leaves the key, %s', async (_role, milliseconds, expected) => {
      await arrangeK()
      await userEvent.hover(key('left/k'))
      await expect.poll(() => drawn().labels.length).toBe(1)
      const advance = freezeTime()

      await userEvent.hover(statusStrip())
      await advance(milliseconds)

      expect(drawn()).toEqual({ ...expected, borders: [] })
    })
  })

  describe('a pointed group', () => {
    it('shows its link, no label, for a pointer inside its border off the keys', async () => {
      await arrangeT()

      await userEvent.hover(canvas(), onCanvas(INSIDE_THUMBFAN))

      await expect.poll(drawn).toEqual({
        labels: [],
        links: ['left/thumbfan anchor link'],
        borders: ['left/thumbfan border'],
      })
      expect(linkEnds('left/thumbfan')).toEqual({
        from: near(screenOf({ x: 9, y: -9 })),
        to: near(screenOf({ x: 10, y: -25 })),
      })
    })

    it('shows its link, no label, for a pointer on its tab', async () => {
      await arrangeT()
      await userEvent.hover(canvas(), onCanvas(INSIDE_THUMBFAN))
      await expect.poll(() => drawn().borders).toEqual(['left/thumbfan border'])
      const advance = freezeTime()

      // Leaving the border starts its grace, so only the tab's own hover outlasts it.
      await userEvent.hover(tab('left/thumbfan'))
      await advance(HOVER_GRACE_MS + 1)

      expect(drawn()).toEqual({
        labels: [],
        links: ['left/thumbfan anchor link'],
        borders: ['left/thumbfan border'],
      })
      expect(linkEnds('left/thumbfan')).toEqual({
        from: near(screenOf({ x: 9, y: -9 })),
        to: near(screenOf({ x: 10, y: -25 })),
      })
    })
  })

  describe('the selection', () => {
    it("keeps a clicked key's label and link once the pointer has left it past the grace", async () => {
      await arrangeT()
      await key('left/thumbfan-mid-home').click()
      const advance = freezeTime()

      await userEvent.hover(statusStrip())
      await advance(HOVER_GRACE_MS + 1)

      expect(drawn()).toEqual({ ...shows('left/thumbfan-mid-home'), borders: [] })
    })

    it("keeps a clicked group's link, no label, once the pointer has left it past the grace", async () => {
      await arrangeT()
      await userEvent.hover(canvas(), onCanvas(INSIDE_THUMBFAN))
      await tab('left/thumbfan').click()
      const advance = freezeTime()

      await userEvent.hover(statusStrip())
      await advance(HOVER_GRACE_MS + 1)

      expect(drawn()).toEqual({
        labels: [],
        links: ['left/thumbfan anchor link'],
        borders: ['left/thumbfan border'],
      })
    })

    it('shows one label and one link for a key both clicked and pointed', async () => {
      await arrangeT()

      await key('left/matrix-middle-top').click()

      await expect.poll(drawn).toEqual({
        ...shows('left/matrix-middle-top'),
        borders: ['left/matrix-middle border'],
      })
    })

    it('shows a label and a link for each of a clicked key and a pointed one', async () => {
      await arrangeT()
      await key('left/thumbfan-mid-home').click()

      await userEvent.hover(key('left/matrix-middle-top'))

      await expect.poll(drawn).toEqual({
        labels: ['left/matrix-middle-top id', 'left/thumbfan-mid-home id'],
        links: ['left/matrix-middle-top anchor link', 'left/thumbfan-mid-home anchor link'],
        borders: ['left/matrix-middle border'],
      })
    })

    it('shows nothing for a selected id with no posted row', async () => {
      const shell = await arrangeIdsAndLinks(designWith('k', 'new'), layoutOf({ k: keyAt(0) }))

      shell.selection.select([aPlacementId('left/k'), aPlacementId('left/new')])

      await expect.poll(drawn).toEqual({ ...shows('left/k'), borders: [] })
    })

    it('shows the label and link of a selected id once a later set places it', async () => {
      const shell = await arrangeIdsAndLinks(designWith('k', 'new'), layoutOf({ k: keyAt(0) }))
      shell.selection.select([aPlacementId('left/new')])
      await expect.element(key('left/k')).toBeInTheDocument()

      shell.post(layoutOf({ k: keyAt(0), new: keyAt(30) }))

      await expect.element(key('left/new')).toBeInTheDocument()
      await expect.poll(drawn).toEqual({ ...shows('left/new'), borders: [] })
    })

    it('shows nothing for a selected key posted unplaced', async () => {
      // Key a keeps the canvas drawing; a set placing no slot shows the new-design hint instead.
      const shell = await arrangeIdsAndLinks(
        designWith('a', 'k'),
        layoutOf({ a: keyAt(0), k: aLayoutRow({ placed: false }) }),
      )

      shell.selection.select([aPlacementId('left/k')])
      await nextTick()

      expect(drawn()).toEqual(NOTHING)
    })
  })

  describe.each(['dark', 'light'] as const)('the label under the %s theme', (scheme) => {
    beforeEach(() => emulateColorScheme(scheme))

    it('fills the panel colour, edges 1px in key-edge and sets the id in text, 11px mono', async () => {
      await arrangeK()

      await userEvent.hover(key('left/k'))

      await expect.poll(() => drawn().labels).toEqual(['left/k id'])
      expect(labelStyle('left/k')).toEqual({
        ...THEMES[scheme],
        strokeWidth: '1px',
        fontSize: CANVAS_LABEL_PX,
        fontFamily: expect.stringContaining('JetBrains Mono'),
      })
    })
  })

  describe('the switch grace', () => {
    it('strokes the label and its text, and the link, in the stale colour', async () => {
      const shell = await arrangeK()
      await shell.router.push({ name: 'outline', params: { id: 'corne' } })
      expectOk(shell.store.run(AddSlot, {}))
      const advance = freezeTime()
      await shell.router.push({ name: 'layout', params: { id: 'corne' } })
      await advance(SWITCH_GRACE_MS + 1)

      await userEvent.hover(key('left/k'))
      await nextTick()

      expect({
        label: labelStyle('left/k'),
        link: getComputedStyle(anchorLinkLine('left/k')).stroke,
      }).toEqual({
        label: {
          fill: PANEL,
          stroke: STALE,
          strokeWidth: '1px',
          text: STALE,
          fontSize: CANVAS_LABEL_PX,
          fontFamily: expect.stringContaining('JetBrains Mono'),
        },
        link: STALE,
      })
    })
  })

  describe('the drawing order', () => {
    it('draws the label and link after every key and border and before every tab, catching no pointer', async () => {
      const design = designOf([aFreeGroup({ id: anId('c'), children: [aSlot({ id: anId('a') })] })])
      const layout = layoutOf({ a: keyAt(0), c: groupRow(rectangle(-10, -10, 10, 10)) })
      await arrangeIdsAndLinks(design, layout)
      const KEYS_AND_BORDERS = ['left/c border', 'left/a']
      const TABS = ['left/c']

      await userEvent.hover(key('left/a'))

      await expect.poll(() => drawn().labels).toEqual(['left/a id'])
      const named = [...canvasSvg().querySelectorAll('[aria-label]')].map((element) =>
        element.getAttribute('aria-label'),
      )
      const at = (name: string) => named.indexOf(name)
      const placed = (name: string) => ({
        afterKeysAndBorders: KEYS_AND_BORDERS.every((drawnFirst) => at(drawnFirst) < at(name)),
        beforeTabs: TABS.every((drawnLater) => at(name) < at(drawnLater)),
      })
      const between = { afterKeysAndBorders: true, beforeTabs: true }
      expect({
        label: placed('left/a id'),
        link: placed('left/a anchor link'),
        labelPointer: getComputedStyle(idLabel('left/a').element()).pointerEvents,
        linkPointer: getComputedStyle(anchorLink('left/a').element()).pointerEvents,
      }).toEqual({ label: between, link: between, labelPointer: 'none', linkPointer: 'none' })
    })
  })

  describe('the Tree', () => {
    it("shows a group's border and link while the pointer is over its row", async () => {
      await arrangeT()
      await page.getByRole('button', { name: 'Tree', exact: true }).click()

      await userEvent.hover(treeRow('thumbfan'))

      await expect.poll(drawn).toEqual({
        labels: [],
        links: ['left/thumbfan anchor link'],
        borders: ['left/thumbfan border'],
      })
    })

    it("shows nothing while the pointer is over a slot's row", async () => {
      await arrangeT()
      await page.getByRole('button', { name: 'Tree', exact: true }).click()

      await userEvent.hover(treeRow('thumbfan-near-home'))
      await nextFrames()

      expect(drawn()).toEqual(NOTHING)
    })
  })

  describe('a commit', () => {
    it("drops a pointed key's label, link and border at once when it deletes the key's group", async () => {
      const shell = await arrangeT()
      await userEvent.hover(key('right/thumbfan-near-home'))
      await expect.poll(() => drawn().labels.length).toBe(1)
      freezeTime()

      expectOk(shell.store.run(DeleteNode, { ids: [anId('thumbfan')] }))
      await nextTick()

      expect(drawn()).toEqual(NOTHING)
    })

    it("keeps a pointed key's label, link and border when it deletes another node", async () => {
      const shell = await arrangeT()
      await userEvent.hover(key('right/thumbfan-near-home'))
      await expect.poll(() => drawn().labels.length).toBe(1)
      freezeTime()

      expectOk(shell.store.run(DeleteNode, { ids: [anId('matrix-middle-top')] }))
      await nextTick()

      expect(drawn()).toEqual({
        ...shows('right/thumbfan-near-home'),
        borders: ['right/thumbfan border'],
      })
    })
  })
})
