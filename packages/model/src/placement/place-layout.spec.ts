import type { Group, LayoutOutput, Node, ResolvedParts } from '@keeb-cad/schema'
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
  aSlot,
  aVec2,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { placeLayout } from './place-layout'

const DIGITS = 9
const RUN = 'key@h'
const KEY = { w: 18, h: 18 }
const GAP = aGap({ x: aLength('1mm'), y: aLength('1mm') })

function slotIds(node: Node): string[] {
  return 'children' in node ? node.children.flatMap(slotIds) : [node.id]
}

// Every slot on one 18 by 18 mm run, unless the test gives parts of its own.
function arrange(layout: Group, parts?: ResolvedParts) {
  const resolved =
    parts ??
    aResolvedParts({
      output: aPartsOutput({ ids: [RUN], rows: [KEY] }),
      slots: Object.fromEntries(slotIds(layout).map((id) => [id, { run: RUN, fit: 'fitted' }])),
    })
  return placeLayout(layout, GAP, resolved)
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
    const output = arrange(inRoot(chain), parts)

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
})
