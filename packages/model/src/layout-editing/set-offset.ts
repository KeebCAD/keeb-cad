import type { Design, Delta, Id, Mutable, Offset, Vec2 } from '@keeb-cad/schema'

import { findNode } from './node-tree'
import type { OffsetEdit, Vec2Edit } from './types'

// The absent axis of a position or pivot set for the first time, since an absent one is the
// identity.
const ORIGIN = '0mm' as Delta

// Unchecked: a missing id is skipped. An offset left with no field is removed, so a cleared node
// and one never edited are the same value.
export function setOffset(design: Mutable<Design>, ids: readonly Id[], edit: OffsetEdit): void {
  for (const id of new Set(ids)) {
    const found = findNode(design.layout, id)
    if (found === undefined) continue
    const offset: Mutable<Offset> = found.node.offset ?? {}
    editVec2(offset, 'position', edit.position)
    if (edit.rotation === null) delete offset.rotation
    else if (edit.rotation !== undefined) offset.rotation = edit.rotation
    editVec2(offset, 'pivot', edit.pivot)
    if (Object.keys(offset).length === 0) delete found.node.offset
    else if (found.node.offset === undefined) found.node.offset = offset
  }
}

function editVec2(
  offset: Mutable<Offset>,
  field: 'position' | 'pivot',
  edit: Vec2Edit | null | undefined,
): void {
  if (edit === null) {
    delete offset[field]
    return
  }
  if (edit?.x === undefined && edit?.y === undefined) return
  const vec2: Vec2 = offset[field] ?? { x: ORIGIN, y: ORIGIN }
  if (edit.x !== undefined) vec2.x = edit.x
  if (edit.y !== undefined) vec2.y = edit.y
  offset[field] = vec2
}
