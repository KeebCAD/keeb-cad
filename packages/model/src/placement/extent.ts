import { apply } from '@keeb-cad/geometry'
import type { Id } from '@keeb-cad/schema'

import { isGroup } from '../layout-editing/node-tree'
import { IDENTITY } from './identity'
import { slotPart } from './slot-part'
import type { Extent, GroupFrames, PlacedRectangle, Placing } from './types'

// The low and high ends along an axis of rectangles taken together, each turned by its frame.
// No rectangle is a point at the origin.
export function extent(rectangles: readonly PlacedRectangle[], axis: 'x' | 'y'): Extent {
  const ends = rectangles.flatMap(({ frame, w, h }) =>
    [
      { x: -w / 2, y: -h / 2 },
      { x: w / 2, y: -h / 2 },
      { x: w / 2, y: h / 2 },
      { x: -w / 2, y: h / 2 },
    ].map((corner) => apply(frame, corner)[axis]),
  )
  return ends.length === 0
    ? { near: 0, far: 0 }
    : { near: Math.min(...ends), far: Math.max(...ends) }
}

// A slot's rectangle; a group's slots placed from inside it, taken together in its frame.
export function nodeExtent(placing: Placing, id: Id, axis: 'x' | 'y', inner: GroupFrames): Extent {
  const node = placing.graph.get(id)?.node
  if (node !== undefined && !isGroup(node)) {
    return extent([{ frame: IDENTITY, ...slotPart(id, placing.parts).rectangle }], axis)
  }
  const rectangles = [...(inner.get(id) ?? [])].flatMap(([slot, { frame }]) => {
    const placed = placing.graph.get(slot)?.node
    return placed === undefined || isGroup(placed)
      ? []
      : [{ frame, ...slotPart(slot, placing.parts).rectangle }]
  })
  return extent(rectangles, axis)
}
