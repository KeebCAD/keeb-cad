import { Result } from '@keeb-cad/result'
import type { Design, Frozen, Id, Rejection } from '@keeb-cad/schema'

import { itemIds } from '../ids/item-ids'
import { reject } from '../reject/reject'
import { findNode, isGroup } from './node-tree'
import type { InsertAt } from './types'

export function checkAddNode(
  design: Frozen<Design>,
  id: Id | undefined,
  { parent: parentId, index }: InsertAt,
): Result<void, Rejection> {
  const found = parentId === undefined ? { node: design.layout } : findNode(design.layout, parentId)
  if (found === undefined || !isGroup(found.node)) {
    const named = parentId ?? design.layout.id
    return Result.err(
      reject('unknown-target', [named], `The design has no group with the id "${named}".`),
    )
  }
  const parent = found.node
  if (index !== undefined && index > parent.children.length) {
    return Result.err(
      reject(
        'index-out-of-range',
        [parent.id],
        `The group "${parent.id}" has ${parent.children.length} children, fewer than index ${index}.`,
      ),
    )
  }
  if (id !== undefined && itemIds(design).has(id)) {
    return Result.err(
      reject('id-taken', [id], `The design already has an item with the id "${id}".`),
    )
  }
  return Result.ok()
}
