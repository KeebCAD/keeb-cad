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
import { placeLayout } from './place-layout'

const DIGITS = 9
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

function frameAt(output: LayoutOutput, id: string) {
  return output.rows[output.ids.indexOf(`left/${id}`)]?.frame
}

const at = (x: number, y: number, rot = 0) => ({
  x: expect.closeTo(x, DIGITS),
  y: expect.closeTo(y, DIGITS),
  rot: expect.closeTo(rot, DIGITS),
  mirrored: false,
})

const offsetY = (y: string) => anOffset({ position: aVec2({ y: aDelta(y) }) })

const slot = (id: string, fields: Parameters<typeof aSlot>[0] = {}) =>
  aSlot({ id: anId(id), ...fields })

const inRoot = (...children: Node[]) => aLayout({ id: anId('root'), children })

describe('placeLayout', () => {
  describe('a y chain of 1u slots, gap 1 mm', () => {
    it('with no slots has the group row only', () => {
      const output = arrange(inRoot(aChainGroup({ id: anId('c'), axis: 'y' })))

      expect(output.ids).toEqual(['left/c', 'left/root'])
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

    expect(output.rows[output.ids.indexOf('left/a')]).toMatchObject({
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

    const row = (kind: string, part: number, fit: string) =>
      expect.objectContaining({
        kind,
        part,
        fit,
        placed: true,
        frame: expect.objectContaining({ mirrored: false }),
      })
    expect(output).toEqual({
      ids: ['left/a', 'left/b', 'left/c', 'left/d', 'left/root'],
      rows: [
        row('slot', 0, 'fitted'),
        row('slot', 1, 'stand-in'),
        row('group', -1, 'fitted'),
        row('slot', 0, 'fitted'),
        row('group', -1, 'fitted'),
      ],
    })
  })

  describe('an explicit anchor', () => {
    const RECTANGLE = { w: 18, h: 17 }

    const anchorAtOf = (output: LayoutOutput, id: string) =>
      output.rows[output.ids.indexOf(`left/${id}`)]?.anchorAt

    const point = (x: number, y: number) => ({
      x: expect.closeTo(x, DIGITS),
      y: expect.closeTo(y, DIGITS),
    })

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

    expect(output.rows[output.ids.indexOf('left/n')]).toEqual({
      kind: 'slot',
      frame: { x: NaN, y: NaN, rot: NaN, mirrored: false },
      anchorAt: { x: NaN, y: NaN },
      part: 0,
      fit: 'fitted',
      placed: false,
    })
  })
})
