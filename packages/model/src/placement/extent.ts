import { apply } from '@keeb-cad/geometry'
import type { Id } from '@keeb-cad/schema'

import { isGroup } from '../layout-editing/node-tree'
import { IDENTITY } from './identity'
import { slotPart } from './slot-part'
import type { Extent, GroupFrames, PlacedSlotSpace, Placing } from './types'

// The low and high ends along an axis of slot spaces taken together, each point turned by its
// slot's frame. No slot space is a point at the origin.
export function extent(placed: readonly PlacedSlotSpace[], axis: 'x' | 'y'): Extent {
  const ends = placed.flatMap(({ frame, slotSpace }) =>
    slotSpace.flatMap(({ outer, holes }) =>
      [...outer, ...holes.flat()].map((point) => apply(frame, point)[axis]),
    ),
  )
  return ends.length === 0
    ? { near: 0, far: 0 }
    : { near: Math.min(...ends), far: Math.max(...ends) }
}

// A slot's slot space; a group's slots placed from inside it, taken together in its frame.
export function nodeExtent(placing: Placing, id: Id, axis: 'x' | 'y', inner: GroupFrames): Extent {
  const node = placing.graph.get(id)?.node
  if (node !== undefined && !isGroup(node)) {
    return extent([{ frame: IDENTITY, slotSpace: slotPart(id, placing.parts).slotSpace }], axis)
  }
  const placed = [...(inner.get(id) ?? [])].flatMap(([slot, { frame }]) => {
    const node = placing.graph.get(slot)?.node
    return node === undefined || isGroup(node)
      ? []
      : [{ frame, slotSpace: slotPart(slot, placing.parts).slotSpace }]
  })
  return extent(placed, axis)
}
