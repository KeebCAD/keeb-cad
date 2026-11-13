import type { Design, Id, Mutable, Rejection } from '@keeb-cad/schema'

import { isNodeReference } from '../references/node-reference'
import { valueAt } from '../references/value-at'
import { walkReferences } from '../references/walk-references'
import { checkDeleteNode } from './check-delete-node'
import { findNode, subtreeIdsOf } from './node-tree'

// A node anchored to a deleted one falls back to its default anchor, its offset as written.
export function deleteNode(design: Mutable<Design>, ids: readonly Id[]): void | Rejection {
  const checked = checkDeleteNode(design, ids)
  if (checked.isErr()) return checked.error
  const deleted = new Set<string>(subtreeIdsOf(design.layout, ids))
  for (const id of ids) {
    // A node inside a subtree deleted earlier in the list is already gone.
    const found = findNode(design.layout, id)
    found?.parent?.children.splice(found.index, 1)
  }
  const anchored = [...walkReferences(design)].filter(
    (reference) => isNodeReference(reference) && deleted.has(reference.target),
  )
  for (const { path } of anchored) {
    // A node reference sits at the node's ['anchor', 'ref'].
    const node = valueAt(design, path.slice(0, -2)) as { anchor?: unknown }
    delete node.anchor
  }
}
