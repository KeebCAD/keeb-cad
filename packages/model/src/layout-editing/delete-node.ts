import type { Design, Id, Mutable, Rejection } from '@keeb-cad/schema'

import { nodeIdOf } from '../ids/side-qualified-id'
import { isNodeReference } from '../references/node-reference'
import { valueAt } from '../references/value-at'
import { walkReferences } from '../references/walk-references'
import { checkDeleteNode } from './check-delete-node'
import { findNode, isGroup, subtreeIdsOf } from './node-tree'

// A node anchored to a deleted one falls back to its default anchor, its offset as written. Every
// override on a deleted slot, either side, goes with it.
export function deleteNode(design: Mutable<Design>, ids: readonly Id[]): void | Rejection {
  const checked = checkDeleteNode(design, ids)
  if (checked.isErr()) return checked.error
  const deleted = new Set<string>(subtreeIdsOf(design.layout, ids))
  const deletedSlots = new Set(
    [...deleted].filter((id) => {
      const found = findNode(design.layout, id)
      return found !== undefined && !isGroup(found.node)
    }),
  )
  for (const id of ids) {
    // A node inside a subtree deleted earlier in the list is already gone.
    const found = findNode(design.layout, id)
    found?.parent?.children.splice(found.index, 1)
  }
  const references = [...walkReferences(design)]
  const anchored = references.filter(
    (reference) => isNodeReference(reference) && deleted.has(reference.target),
  )
  for (const { path } of anchored) {
    // A node reference sits at the node's ['anchor', 'ref'].
    const node = valueAt(design, path.slice(0, -2)) as { anchor?: unknown }
    delete node.anchor
  }
  // An override's target sits at ['overrides', index, 'target']; the highest index goes first so
  // the lower ones stay put.
  const overridden = references
    .filter(({ kind, target }) => kind === 'side-placement' && deletedSlots.has(nodeIdOf(target)))
    .map(({ path }) => path[1] as number)
    .toSorted((a, b) => b - a)
  for (const index of overridden) design.overrides.splice(index, 1)
}
