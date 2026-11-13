import { FLATTEN_TOL } from '@keeb-cad/geometry'
import { compareId, type Group, type LayoutOutput, type PartsOutput } from '@keeb-cad/schema'
import {
  aChainGroup,
  aFreeGroup,
  aGroupAnchor,
  aLayout,
  aLayoutOutput,
  aLayoutRow,
  anId,
  aPartsOutput,
  aSlot,
  aSlotAnchor,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { groupBorders } from './group-borders'

type Row = LayoutOutput['rows'][number]
type Loop = Row['border'][number]['outer']
type Point = Loop[number]

const DIGITS = 6
const MARGIN = 1
const KEY = { w: 18, h: 18 }

// The layout and its rows by side-qualified id, every slot on one 18 × 18 mm run unless the test
// gives parts of its own.
function arrange(
  layout: Group,
  rows: Record<string, Row>,
  parts: PartsOutput = aPartsOutput({ ids: ['key@h'], rows: [KEY] }),
) {
  const ids = Object.keys(rows).toSorted(compareId)
  const placed = aLayoutOutput({ ids, rows: ids.map((id) => rows[id] as Row) })
  return { layout, placed, parts }
}

const slotAt = (x: number, y: number, fields: Partial<Row> = {}) =>
  aLayoutRow({ frame: { x, y, rot: 0, mirrored: false }, ...fields })

const mirroredSlotAt = (x: number, y: number) =>
  slotAt(x, y, { frame: { x, y, rot: 0, mirrored: true } })

const groupAt = (x: number, y: number, mirrored = false) =>
  aLayoutRow({ kind: 'group', part: -1, frame: { x, y, rot: 0, mirrored } })

const unplaced = (kind: Row['kind']) =>
  aLayoutRow({
    kind,
    part: kind === 'group' ? -1 : 0,
    frame: { x: NaN, y: NaN, rot: NaN, mirrored: false },
    anchorAt: { x: NaN, y: NaN },
    placed: false,
  })

function borderOf(output: LayoutOutput, id: string): Row['border'] {
  return output.rows[output.ids.indexOf(id)]?.border ?? []
}

function bounds(loop: Loop) {
  const xs = loop.map(({ x }) => x)
  const ys = loop.map(({ y }) => y)
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  }
}

function closeBounds(minX: number, minY: number, maxX: number, maxY: number) {
  return {
    minX: expect.closeTo(minX, DIGITS),
    minY: expect.closeTo(minY, DIGITS),
    maxX: expect.closeTo(maxX, DIGITS),
    maxY: expect.closeTo(maxY, DIGITS),
  }
}

// Each region's holes and its outer loop's bounds.
function regionsOf(border: Row['border']) {
  return border.map(({ outer, holes }) => ({ holes, bounds: bounds(outer) }))
}

function noHoles(minX: number, minY: number, maxX: number, maxY: number) {
  return { holes: [], bounds: closeBounds(minX, minY, maxX, maxY) }
}

// A ray cast to the right: inside when it crosses the loop an odd number of times.
function isInside({ x, y }: Point, loop: Loop): boolean {
  let inside = false
  for (const [index, a] of loop.entries()) {
    const b = loop[(index + 1) % loop.length] as Point
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

function distanceToLoop(point: Point, loop: Loop): number {
  return Math.min(
    ...loop.map((a, index) =>
      distanceToSegment(point, a, loop[(index + 1) % loop.length] as Point),
    ),
  )
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function twoColumns() {
  const layout = aLayout({
    children: [
      aChainGroup({
        id: anId('parent'),
        children: [
          aChainGroup({
            id: anId('first'),
            axis: 'y',
            children: [aSlot({ id: anId('a') }), aSlot({ id: anId('b') })],
          }),
          aChainGroup({
            id: anId('second'),
            axis: 'y',
            children: [aSlot({ id: anId('c') }), aSlot({ id: anId('d') })],
          }),
        ],
      }),
    ],
  })
  return arrange(layout, {
    'left/root': groupAt(0, 0),
    'left/parent': groupAt(0, 0),
    'left/first': groupAt(0, 0),
    'left/second': groupAt(19, 0),
    'left/a': slotAt(0, 0),
    'left/b': slotAt(0, 19),
    'left/c': slotAt(19, 0),
    'left/d': slotAt(19, 19),
  })
}

// A free group of one key, both at (x, 0) on the left and mirrored at (−x, 0) on the right.
function oneKeyGroup(x: number) {
  const layout = aLayout({
    children: [aFreeGroup({ id: anId('g'), children: [aSlot({ id: anId('k') })] })],
  })
  return arrange(layout, {
    'left/root': groupAt(0, 0),
    'left/g': groupAt(x, 0),
    'left/k': slotAt(x, 0),
    'right/root': groupAt(0, 0, true),
    'right/g': groupAt(-x, 0, true),
    'right/k': mirroredSlotAt(-x, 0),
  })
}

describe('groupBorders', () => {
  describe('on a parent of two columns', () => {
    it('sits each column one margin outside its keys', () => {
      const { layout, placed, parts } = twoColumns()

      const output = groupBorders(layout, placed, parts, MARGIN)

      expect({
        first: regionsOf(borderOf(output, 'left/first')),
        second: regionsOf(borderOf(output, 'left/second')),
      }).toEqual({
        first: [noHoles(-10, -10, 10, 29)],
        second: [noHoles(9, -10, 29, 29)],
      })
    })

    it("sits the parent one margin outside the columns' borders", () => {
      const { layout, placed, parts } = twoColumns()

      const output = groupBorders(layout, placed, parts, MARGIN)

      expect(regionsOf(borderOf(output, 'left/parent'))).toEqual([noHoles(-11, -11, 30, 30)])
    })

    it.each([
      ['just inside', 0.5, true],
      ['just beyond', 1.5, false],
    ])(
      "puts a point %s the column margin, out from a key's outer edge, inside the parent and in the column only within it",
      (_role, out, expectedInColumn) => {
        const { layout, placed, parts } = twoColumns()
        const point = { x: -9 - out, y: 0 }

        const output = groupBorders(layout, placed, parts, MARGIN)

        const [column] = borderOf(output, 'left/first')
        const [parent] = borderOf(output, 'left/parent')
        expect({
          column: isInside(point, column?.outer ?? []),
          parent: isInside(point, parent?.outer ?? []),
        }).toEqual({ column: expectedInColumn, parent: true })
      },
    )

    it("puts a point on the column margin on the column's outer loop and inside the parent", () => {
      const { layout, placed, parts } = twoColumns()
      const point = { x: -9 - MARGIN, y: 0 }

      const output = groupBorders(layout, placed, parts, MARGIN)

      const [column] = borderOf(output, 'left/first')
      const [parent] = borderOf(output, 'left/parent')
      expect({
        onColumn: distanceToLoop(point, column?.outer ?? []) <= FLATTEN_TOL,
        inParent: isInside(point, parent?.outer ?? []),
      }).toEqual({ onColumn: true, inParent: true })
    })

    it('posts no border for a slot', () => {
      const { layout, placed, parts } = twoColumns()

      const output = groupBorders(layout, placed, parts, MARGIN)

      expect(output.rows.filter(({ kind }) => kind === 'slot').map(({ border }) => border)).toEqual(
        [[], [], [], []],
      )
    })
  })

  it('posts no border for the root on either side', () => {
    const { layout, placed, parts } = oneKeyGroup(0)

    const output = groupBorders(layout, placed, parts, MARGIN)

    expect([borderOf(output, 'left/root'), borderOf(output, 'right/root')]).toEqual([[], []])
  })

  it('posts no border for a placed group with no children', () => {
    const { layout, placed, parts } = arrange(
      aLayout({ children: [aFreeGroup({ id: anId('empty') })] }),
      { 'left/root': groupAt(0, 0), 'left/empty': groupAt(0, 0) },
    )

    const output = groupBorders(layout, placed, parts, MARGIN)

    expect(borderOf(output, 'left/empty')).toEqual([])
  })

  it('grows a free group of one key at its origin by one margin', () => {
    const { layout, placed, parts } = oneKeyGroup(0)

    const output = groupBorders(layout, placed, parts, MARGIN)

    expect(regionsOf(borderOf(output, 'left/g'))).toEqual([noHoles(-10, -10, 10, 10)])
  })

  it('posts no border for a group in an anchor cycle, though a key in it is placed', () => {
    const layout = aLayout({
      children: [
        aSlot({ id: anId('outside') }),
        aFreeGroup({
          id: anId('u'),
          anchor: aGroupAnchor({ ref: anId('w') }),
          children: [aSlot({ id: anId('k'), anchor: aSlotAnchor({ ref: anId('outside') }) })],
        }),
        aFreeGroup({ id: anId('w'), anchor: aGroupAnchor({ ref: anId('u') }) }),
      ],
    })
    const { placed, parts } = arrange(layout, {
      'left/root': groupAt(0, 0),
      'left/outside': slotAt(0, 0),
      'left/u': unplaced('group'),
      'left/w': unplaced('group'),
      'left/k': slotAt(19, 0),
      'right/root': groupAt(0, 0, true),
      'right/outside': mirroredSlotAt(0, 0),
      'right/u': unplaced('group'),
      'right/w': unplaced('group'),
      'right/k': mirroredSlotAt(-19, 0),
    })

    const output = groupBorders(layout, placed, parts, MARGIN)

    expect([
      borderOf(output, 'left/u'),
      borderOf(output, 'left/w'),
      borderOf(output, 'right/u'),
      borderOf(output, 'right/w'),
    ]).toEqual([[], [], [], []])
  })

  it('counts levels through an unplaced middle group', () => {
    const keyX = 40
    const layout = aLayout({
      children: [
        aSlot({ id: anId('outside') }),
        aFreeGroup({
          id: anId('g'),
          children: [
            aFreeGroup({
              id: anId('m'),
              anchor: aGroupAnchor({ ref: anId('missing') }),
              children: [aSlot({ id: anId('k'), anchor: aSlotAnchor({ ref: anId('outside') }) })],
            }),
          ],
        }),
      ],
    })
    const { placed, parts } = arrange(layout, {
      'left/root': groupAt(0, 0),
      'left/outside': slotAt(0, 0),
      'left/g': groupAt(0, 0),
      'left/m': unplaced('group'),
      'left/k': slotAt(keyX, 0),
      'right/root': groupAt(0, 0, true),
      'right/outside': mirroredSlotAt(0, 0),
      'right/g': groupAt(0, 0, true),
      'right/m': unplaced('group'),
      'right/k': mirroredSlotAt(-keyX, 0),
    })

    const output = groupBorders(layout, placed, parts, MARGIN)

    expect({
      middle: [borderOf(output, 'left/m'), borderOf(output, 'right/m')],
      outer: regionsOf(borderOf(output, 'left/g')),
    }).toEqual({ middle: [[], []], outer: [noHoles(keyX - 11, -11, keyX + 11, 11)] })
  })

  it('leaves an unplaced key out of its group', () => {
    const layout = aLayout({
      children: [
        aFreeGroup({
          id: anId('g'),
          children: [
            aSlot({ id: anId('k') }),
            aSlot({ id: anId('p'), anchor: aSlotAnchor({ ref: anId('q') }) }),
            aSlot({ id: anId('q'), anchor: aSlotAnchor({ ref: anId('p') }) }),
          ],
        }),
      ],
    })
    const { placed, parts } = arrange(layout, {
      'left/root': groupAt(0, 0),
      'left/g': groupAt(0, 0),
      'left/k': slotAt(0, 0),
      'left/p': unplaced('slot'),
      'left/q': unplaced('slot'),
    })

    const output = groupBorders(layout, placed, parts, MARGIN)

    expect(regionsOf(borderOf(output, 'left/g'))).toEqual([noHoles(-10, -10, 10, 10)])
  })

  it('gives keys sitting apart two regions, the lower-left one first', () => {
    const layout = aLayout({
      children: [
        aFreeGroup({
          id: anId('g'),
          children: [aSlot({ id: anId('k') }), aSlot({ id: anId('l') })],
        }),
      ],
    })
    const { placed, parts } = arrange(layout, {
      'left/root': groupAt(0, 0),
      'left/g': groupAt(0, 0),
      'left/k': slotAt(0, 0),
      'left/l': slotAt(40, 0),
    })

    const output = groupBorders(layout, placed, parts, MARGIN)

    expect(regionsOf(borderOf(output, 'left/g'))).toEqual([
      noHoles(-10, -10, 10, 10),
      noHoles(30, -10, 50, 10),
    ])
  })

  it("draws each side's border from that side's own rows", () => {
    const { layout, placed, parts } = oneKeyGroup(30)

    const output = groupBorders(layout, placed, parts, MARGIN)

    expect({
      left: regionsOf(borderOf(output, 'left/g')),
      right: regionsOf(borderOf(output, 'right/g')),
    }).toEqual({ left: [noHoles(20, -10, 40, 10)], right: [noHoles(-40, -10, -20, 10)] })
  })

  it('grows a stand-in key by the run its row points at', () => {
    const layout = aLayout({
      children: [aFreeGroup({ id: anId('g'), children: [aSlot({ id: anId('k') })] })],
    })
    const { placed, parts } = arrange(
      layout,
      {
        'left/root': groupAt(0, 0),
        'left/g': groupAt(0, 0),
        'left/k': slotAt(0, 0, { part: 1, fit: 'stand-in' }),
      },
      aPartsOutput({ ids: ['key@h', 'stand-in'], rows: [{ w: 27, h: 27 }, KEY] }),
    )

    const output = groupBorders(layout, placed, parts, MARGIN)

    expect(regionsOf(borderOf(output, 'left/g'))).toEqual([noHoles(-10, -10, 10, 10)])
  })

  it("posts no border for a group whose key sits past clipper's range, the key's row unchanged", () => {
    const farX = 1e10
    const layout = aLayout({
      children: [aFreeGroup({ id: anId('g'), children: [aSlot({ id: anId('k') })] })],
    })
    const key = slotAt(farX, 0)
    const { placed, parts } = arrange(layout, {
      'left/root': groupAt(0, 0),
      'left/g': groupAt(0, 0),
      'left/k': key,
    })

    const output = groupBorders(layout, placed, parts, MARGIN)

    expect({
      group: borderOf(output, 'left/g'),
      key: output.rows[output.ids.indexOf('left/k')],
    }).toEqual({ group: [], key })
  })
})
