import type { Group, Id, LayoutOutput, Node, ResolvedParts } from '@keeb-cad/schema'
import {
  aChainGroup,
  aDelta,
  aFreeGroup,
  aGap,
  aLayout,
  aLength,
  anAngle,
  anId,
  anOffset,
  aPartsOutput,
  aResolvedParts,
  anAttachPoint,
  aGroupAnchor,
  aSlot,
  aSlotAnchor,
  aVec2,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkAnchors } from '../dependencies/check-anchors'
import type { PlacementSide } from '../ids/types'
import { placeLayout } from './place-layout'

const DIGITS = 9
// The boundary table gives carried frames to four decimals.
const TABLE_DIGITS = 4
const RUN = 'key@h'
const KEY = { w: 18, h: 18 }
const GAP = aGap({ x: aLength('1mm'), y: aLength('1mm') })

function slotIds(node: Node): string[] {
  return 'children' in node ? node.children.flatMap(slotIds) : [node.id]
}

// Every slot on one run, 18 by 18 mm unless the test gives a rectangle or parts of its own.
function arrange(
  layout: Group,
  { parts, rectangle = KEY, unplaced = new Set() }: Arrangement = {},
) {
  const resolved =
    parts ??
    aResolvedParts({
      output: aPartsOutput({ ids: [RUN], rows: [rectangle] }),
      slots: Object.fromEntries(slotIds(layout).map((id) => [id, { run: RUN, fit: 'fitted' }])),
    })
  return placeLayout(layout, GAP, resolved, unplaced)
}

interface Arrangement {
  parts?: ResolvedParts
  rectangle?: { w: number; h: number }
  unplaced?: ReadonlySet<Id>
}

function rowAt(output: LayoutOutput, id: string, side: PlacementSide = 'left') {
  return output.rows[output.ids.indexOf(`${side}/${id}`)]
}

function frameAt(output: LayoutOutput, id: string, side: PlacementSide = 'left') {
  return rowAt(output, id, side)?.frame
}

const at = (x: number, y: number, rot = 0, mirrored = false) => ({
  x: expect.closeTo(x, DIGITS),
  y: expect.closeTo(y, DIGITS),
  rot: expect.closeTo(rot, DIGITS),
  mirrored,
})

const about = (x: number, y: number, rot: number, mirrored = false) => ({
  x: expect.closeTo(x, TABLE_DIGITS),
  y: expect.closeTo(y, TABLE_DIGITS),
  rot: expect.closeTo(rot, TABLE_DIGITS),
  mirrored,
})

const point = (x: number, y: number) => ({
  x: expect.closeTo(x, DIGITS),
  y: expect.closeTo(y, DIGITS),
})

const moved = (x: string, y: string, rotation?: string) =>
  anOffset({
    position: aVec2({ x: aDelta(x), y: aDelta(y) }),
    ...(rotation === undefined ? {} : { rotation: anAngle(rotation) }),
  })

const turned = (rotation: string) => anOffset({ rotation: anAngle(rotation) })

const offsetY = (y: string) => anOffset({ position: aVec2({ y: aDelta(y) }) })

const slot = (id: string, fields: Parameters<typeof aSlot>[0] = {}) =>
  aSlot({ id: anId(id), ...fields })

const inRoot = (...children: Node[]) => aLayout({ id: anId('root'), children })

describe('placeLayout', () => {
  describe('a y chain of 1u slots, gap 1 mm', () => {
    it('with no slots has the group row only', () => {
      const output = arrange(inRoot(aChainGroup({ id: anId('c'), axis: 'y' })))

      expect(output.ids).toEqual(['left/c', 'left/root', 'right/c', 'right/root'])
    })

    it('puts one slot on the chain’s origin', () => {
      const output = arrange(
        inRoot(aChainGroup({ id: anId('c'), axis: 'y', children: [slot('a')] })),
      )

      expect(frameAt(output, 'a')).toEqual(at(0, 0))
    })

    it('steps three slots edge to edge: 0, 19, 38', () => {
      const chain = aChainGroup({
        id: anId('c'),
        axis: 'y',
        children: [slot('a'), slot('b'), slot('d')],
      })
      const output = arrange(inRoot(chain))

      expect(['a', 'b', 'd'].map((id) => frameAt(output, id))).toEqual([
        at(0, 0),
        at(0, 19),
        at(0, 38),
      ])
    })
  })

  it('steps an x chain past a free group by the group’s slots taken together', () => {
    const group = aFreeGroup({
      id: anId('g'),
      children: [
        slot('g-low', { offset: offsetY('0mm') }),
        slot('g-high', { offset: offsetY('19mm') }),
      ],
    })
    const output = arrange(
      inRoot(aChainGroup({ id: anId('c'), axis: 'x', children: [slot('a'), group] })),
    )

    expect(frameAt(output, 'g')).toEqual(at(19, 0))
  })

  it('steps a y chain into and past a group by its extent: group 19, its slots 19 and 38, last slot 57', () => {
    const group = aFreeGroup({
      id: anId('g'),
      children: [
        slot('g-low', { offset: offsetY('0mm') }),
        slot('g-high', { offset: offsetY('19mm') }),
      ],
    })
    const chain = aChainGroup({ id: anId('c'), axis: 'y', children: [slot('a'), group, slot('z')] })
    const output = arrange(inRoot(chain))

    expect(['g', 'g-low', 'g-high', 'z'].map((id) => frameAt(output, id))).toEqual([
      at(0, 19),
      at(0, 19),
      at(0, 38),
      at(0, 57),
    ])
  })

  it('steps past an empty group as a point at its origin: group 10, last slot 20', () => {
    const chain = aChainGroup({
      id: anId('c'),
      axis: 'y',
      children: [slot('a'), aFreeGroup({ id: anId('g') }), slot('z')],
    })
    const output = arrange(inRoot(chain))

    expect([frameAt(output, 'g'), frameAt(output, 'z')]).toEqual([at(0, 10), at(0, 20)])
  })

  it('places a slot with no offset in a free group on the parent’s origin, anchored there', () => {
    const group = aFreeGroup({
      id: anId('g'),
      offset: anOffset({ position: aVec2({ x: aDelta('5mm') }) }),
    })
    const output = arrange(inRoot({ ...group, children: [slot('a')] }))

    expect(rowAt(output, 'a')).toMatchObject({
      frame: at(5, 0),
      anchorAt: { x: expect.closeTo(5, DIGITS), y: expect.closeTo(0, DIGITS) },
    })
  })

  it('steps past a group holding one slot turned 45 deg by its turned extent: 9 + 1 + 9√2', () => {
    const group = aFreeGroup({
      id: anId('g'),
      children: [slot('t', { offset: anOffset({ rotation: anAngle('45deg') }) })],
    })
    const output = arrange(
      inRoot(aChainGroup({ id: anId('c'), axis: 'y', children: [slot('a'), group] })),
    )

    expect(frameAt(output, 'g')).toEqual(at(0, 9 + 1 + 9 * Math.SQRT2))
  })

  it('reads a slot turned 190 deg as −170', () => {
    const output = arrange(inRoot(slot('a', { offset: anOffset({ rotation: anAngle('190deg') }) })))

    expect(frameAt(output, 'a')).toEqual(at(0, 0, -170))
  })

  describe('rotation carried along a chain', () => {
    it('turns the sibling after a turned child', () => {
      const chain = aChainGroup({
        id: anId('c'),
        axis: 'y',
        children: [slot('a'), slot('b', { offset: turned('15deg') }), slot('d')],
      })

      const output = arrange(inRoot(chain))

      expect(frameAt(output, 'd')).toEqual(about(-4.9176, 37.3526, 15))
    })

    it('steps straight after a counter-turn cancels the carried turn', () => {
      const chain = aChainGroup({
        id: anId('c'),
        axis: 'y',
        children: [
          slot('a'),
          slot('b', { offset: turned('15deg') }),
          slot('d', { offset: turned('-15deg') }),
          slot('e'),
        ],
      })

      const output = arrange(inRoot(chain))

      expect(['d', 'e'].map((id) => frameAt(output, id))).toEqual([
        about(-4.9176, 37.3526, 0),
        about(-4.9176, 56.3526, 0),
      ])
    })

    it('steps a wide slot from a turned sibling by its own rectangle, then applies its offset', () => {
      const wide = slot('d', {
        offset: anOffset({
          position: aVec2({ x: aDelta('-1.037mm'), y: aDelta('2.122mm') }),
          rotation: anAngle('75deg'),
        }),
      })
      const chain = aChainGroup({
        id: anId('c'),
        axis: 'x',
        children: [slot('a'), slot('b', { offset: turned('-15deg') }), wide],
      })
      const parts = aResolvedParts({
        output: aPartsOutput({ ids: [RUN, 'wide@h'], rows: [KEY, { w: 27, h: 18 }] }),
        slots: {
          [anId('a')]: { run: RUN, fit: 'fitted' },
          [anId('b')]: { run: RUN, fit: 'fitted' },
          [anId('d')]: { run: 'wide@h', fit: 'fitted' },
        },
      })

      const output = arrange(inRoot(chain), { parts })

      expect(['a', 'd'].map((id) => frameAt(output, id))).toEqual([
        about(0, 0, 0),
        about(41.2468, -3.7642, 60),
      ])
    })
  })

  it('lists a three-slot chain by compareId, slots on their run’s row and fit, groups on −1', () => {
    const chain = aChainGroup({
      id: anId('c'),
      axis: 'y',
      children: [slot('b'), slot('a'), slot('d')],
    })
    const parts = aResolvedParts({
      output: aPartsOutput({ ids: ['other@h', 'stand-in'], rows: [KEY, KEY] }),
      slots: {
        [anId('b')]: { run: 'stand-in', fit: 'stand-in' },
        [anId('a')]: { run: 'other@h', fit: 'fitted' },
        [anId('d')]: { run: 'other@h', fit: 'fitted' },
      },
    })
    const output = arrange(inRoot(chain), { parts })

    const row = (kind: string, part: number, fit: string, y: number, mirrored: boolean) => ({
      kind,
      frame: at(0, y, 0, mirrored),
      anchorAt: point(0, y),
      part,
      fit,
      placed: true,
      border: [],
    })
    expect(output).toEqual({
      ids: [
        'left/a',
        'left/b',
        'left/c',
        'left/d',
        'left/root',
        'right/a',
        'right/b',
        'right/c',
        'right/d',
        'right/root',
      ],
      rows: [
        row('slot', 0, 'fitted', 19, false),
        row('slot', 1, 'stand-in', 0, false),
        row('group', -1, 'fitted', 0, false),
        row('slot', 0, 'fitted', 38, false),
        row('group', -1, 'fitted', 0, false),
        row('slot', 0, 'fitted', 19, true),
        row('slot', 1, 'stand-in', 0, true),
        row('group', -1, 'fitted', 0, true),
        row('slot', 0, 'fitted', 38, true),
        row('group', -1, 'fitted', 0, true),
      ],
    })
  })

  describe('an explicit anchor', () => {
    const RECTANGLE = { w: 18, h: 17 }

    const anchorAtOf = (output: LayoutOutput, id: string) => rowAt(output, id)?.anchorAt

    it.each([
      ['omitted, the center', undefined, 0, 0],
      ['center', 'center', 0, 0],
      ['edge-top', 'edge-top', 0, 8.5],
      ['edge-bottom', 'edge-bottom', 0, -8.5],
      ['edge-left', 'edge-left', -9, 0],
      ['edge-right', 'edge-right', 9, 0],
      ['corner-tl', 'corner-tl', -9, 8.5],
      ['corner-tr', 'corner-tr', 9, 8.5],
      ['corner-bl', 'corner-bl', -9, -8.5],
      ['corner-br', 'corner-br', 9, -8.5],
    ])(
      'on a slot at the origin puts anchorAt on its attach point, %s',
      (_role, attach, expectedX, expectedY) => {
        const anchor = aSlotAnchor({
          ref: anId('k'),
          ...(attach === undefined ? {} : { attach: anAttachPoint(attach) }),
        })
        const output = arrange(inRoot(slot('k'), slot('n', { anchor })), { rectangle: RECTANGLE })

        expect(anchorAtOf(output, 'n')).toEqual(point(expectedX, expectedY))
      },
    )

    it('turns the attach point with a slot turned 90 deg, and the node with it', () => {
      const turned = slot('k', { offset: anOffset({ rotation: anAngle('90deg') }) })
      const anchored = slot('n', {
        anchor: aSlotAnchor({ ref: anId('k'), attach: anAttachPoint('edge-top') }),
      })
      const output = arrange(inRoot(turned, anchored), { rectangle: RECTANGLE })

      expect({ anchorAt: anchorAtOf(output, 'n'), frame: frameAt(output, 'n') }).toEqual({
        anchorAt: point(-8.5, 0),
        frame: at(-8.5, 0, 90),
      })
    })

    it.each([
      ['on its default, the parent', undefined, 2, 0],
      ['on a group, its origin', aGroupAnchor({ ref: anId('g') }), 12, 20],
    ])('places the node %s, then its offset', (_role, anchor, expectedX, expectedY) => {
      const group = aFreeGroup({
        id: anId('g'),
        offset: anOffset({ position: aVec2({ x: aDelta('10mm'), y: aDelta('20mm') }) }),
      })
      const moved = slot('n', {
        offset: anOffset({ position: aVec2({ x: aDelta('2mm') }) }),
        ...(anchor === undefined ? {} : { anchor }),
      })
      const output = arrange(inRoot(group, moved))

      expect(frameAt(output, 'n')).toEqual(at(expectedX, expectedY))
    })

    it('moves every dependant along when the anchored-to slot moves', () => {
      const layoutWith = (x: string) =>
        inRoot(
          slot('a', { offset: anOffset({ position: aVec2({ x: aDelta(x) }) }) }),
          slot('b', { anchor: aSlotAnchor({ ref: anId('a') }) }),
          slot('c', { anchor: aSlotAnchor({ ref: anId('b') }) }),
        )
      const before = arrange(layoutWith('10mm'))
      const after = arrange(layoutWith('30mm'))

      const xOf = (output: LayoutOutput, id: string) => frameAt(output, id)?.x ?? NaN
      expect(['b', 'c'].map((id) => xOf(after, id) - xOf(before, id))).toEqual([
        expect.closeTo(20, DIGITS),
        expect.closeTo(20, DIGITS),
      ])
    })
  })

  describe('a group extent with a descendant anchored outside the group', () => {
    const fan = (t: Parameters<typeof aSlot>[0], u: Parameters<typeof aSlot>[0] = {}) =>
      inRoot(
        aChainGroup({
          id: anId('y'),
          axis: 'y',
          children: [
            slot('s0'),
            aFreeGroup({ id: anId('g'), children: [slot('t', t), slot('u', u)] }),
          ],
        }),
        slot('x', { offset: anOffset({ position: aVec2({ x: aDelta('50mm') }) }) }),
      )
    const onX = { anchor: aSlotAnchor({ ref: anId('x') }) }

    it('steps the group by the slots placed from inside it, the anchored one on its target', () => {
      const output = arrange(fan(onX))

      expect(['g', 'u', 't'].map((id) => frameAt(output, id))).toEqual([
        at(0, 19),
        at(0, 19),
        at(50, 0),
      ])
    })

    it('makes a group whose every slot is anchored outside it a point at its origin', () => {
      const output = arrange(fan(onX, onX))

      expect(frameAt(output, 'g')).toEqual(at(0, 10))
    })

    it('counts a slot anchored to a sibling inside the group', () => {
      const output = arrange(
        fan({ anchor: aSlotAnchor({ ref: anId('u') }), offset: offsetY('-19mm') }),
      )

      expect(['g', 'u', 't'].map((id) => frameAt(output, id))).toEqual([
        at(0, 38),
        at(0, 38),
        at(0, 19),
      ])
    })
  })

  it('writes a slot unplaced by a dangling anchor with NaN frame and anchorAt, its part and fit kept', () => {
    const layout = inRoot(slot('n', { anchor: aSlotAnchor({ ref: anId('missing') }) }))
    const output = arrange(layout, { unplaced: checkAnchors(layout).unplaced })

    expect(rowAt(output, 'n')).toEqual({
      kind: 'slot',
      frame: { x: NaN, y: NaN, rot: NaN, mirrored: false },
      anchorAt: { x: NaN, y: NaN },
      part: 0,
      fit: 'fitted',
      placed: false,
      border: [],
    })
  })

  describe('the right side, reflected across center’s y-axis', () => {
    it('reflects a turned slot across center’s y-axis', () => {
      const output = arrange(inRoot(slot('a', { offset: moved('-20mm', '5mm', '15deg') })))

      expect([frameAt(output, 'a'), frameAt(output, 'a', 'right')]).toEqual([
        at(-20, 5, 15),
        at(20, 5, -15, true),
      ])
    })

    it.each([
      ['just below the half turn', '179deg', -179],
      ['on the half turn', '180deg', 180],
      ['just above the negative half turn', '-179deg', 179],
    ])('wraps a reflected rotation %s into the half-open turn', (_role, rotation, expectedRot) => {
      const output = arrange(inRoot(slot('a', { offset: turned(rotation) })))

      expect(frameAt(output, 'a', 'right')).toEqual(at(0, 0, expectedRot, true))
    })

    it('reflects across the y-axis of a moved and turned center, not the world’s', () => {
      const layout = aLayout({
        id: anId('root'),
        offset: moved('10mm', '0mm', '90deg'),
        children: [slot('a', { offset: moved('3mm', '5mm') })],
      })

      const output = arrange(layout)

      expect([
        frameAt(output, 'a'),
        frameAt(output, 'a', 'right'),
        frameAt(output, 'root', 'right'),
      ]).toEqual([at(5, 3, 90), at(5, -3, 90, true), at(10, 0, 90, true)])
    })

    it.each([
      ['edge-left reads as the right slot’s edge-right', 'edge-left', 39, 0],
      ['corner-tl reads as the right slot’s corner-tr', 'corner-tl', 39, 9],
    ])('swaps attach points: %s', (_role, attach, expectedX, expectedY) => {
      const anchor = aSlotAnchor({ ref: anId('a'), attach: anAttachPoint(attach) })
      const output = arrange(
        inRoot(slot('a', { offset: moved('-30mm', '0mm') }), slot('b', { anchor })),
      )

      expect(rowAt(output, 'b', 'right')).toMatchObject({
        frame: at(expectedX, expectedY, 0, true),
        anchorAt: point(expectedX, expectedY),
      })
    })

    it('posts both sides of every node, the root included, in id order', () => {
      const output = arrange(inRoot(slot('a')))

      expect(output.ids).toEqual(['left/a', 'left/root', 'right/a', 'right/root'])
    })

    it('posts both sides of the root of an empty layout', () => {
      const output = arrange(inRoot())

      expect(output.ids).toEqual(['left/root', 'right/root'])
    })

    it('writes the right rows of slots in an anchor cycle unplaced and mirrored', () => {
      const layout = inRoot(
        slot('a', { anchor: aSlotAnchor({ ref: anId('b') }) }),
        slot('b', { anchor: aSlotAnchor({ ref: anId('a') }) }),
      )
      const output = arrange(layout, { unplaced: checkAnchors(layout).unplaced })

      const expectedUnplaced = {
        kind: 'slot',
        frame: { x: NaN, y: NaN, rot: NaN, mirrored: true },
        anchorAt: { x: NaN, y: NaN },
        part: 0,
        fit: 'fitted',
        placed: false,
        border: [],
      }
      expect([rowAt(output, 'a', 'right'), rowAt(output, 'b', 'right')]).toEqual([
        expectedUnplaced,
        expectedUnplaced,
      ])
    })

    it('gives a stand-in slot’s right row the left row’s kind, part and fit', () => {
      const parts = aResolvedParts({
        output: aPartsOutput({ ids: ['stand-in'], rows: [KEY] }),
        slots: { [anId('s')]: { run: 'stand-in', fit: 'stand-in' } },
      })
      const output = arrange(inRoot(slot('s')), { parts })

      const expectedFields = { kind: 'slot', part: 0, fit: 'stand-in' }
      expect([rowAt(output, 's'), rowAt(output, 's', 'right')]).toMatchObject([
        expectedFields,
        expectedFields,
      ])
    })

    it('reflects a slot inside a turned group with the group', () => {
      const group = aFreeGroup({
        id: anId('g'),
        offset: moved('-20mm', '0mm', '90deg'),
        children: [slot('s', { offset: moved('0mm', '10mm') })],
      })

      const output = arrange(inRoot(group))

      expect([
        frameAt(output, 's'),
        frameAt(output, 's', 'right'),
        frameAt(output, 'g', 'right'),
      ]).toEqual([at(-30, 0, 90), at(30, 0, -90, true), at(20, 0, -90, true)])
    })
  })
})
