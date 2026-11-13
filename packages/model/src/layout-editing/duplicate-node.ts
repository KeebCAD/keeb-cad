import { InvariantError } from '@keeb-cad/result'
import type { Design, Id, Mutable, Node, Rejection } from '@keeb-cad/schema'

import { itemIds } from '../ids/item-ids'
import { isNodeReference } from '../references/node-reference'
import { valueAt } from '../references/value-at'
import { walkNodeReferences } from '../references/walk-references'
import { checkDuplicateNode } from './check-duplicate-node'
import { copyId } from './copy-id'
import { findNode, isGroup } from './node-tree'

// A copied anchor names the copy of its target when the target was copied too.
export function duplicateNode(design: Mutable<Design>, id: Id): void | Rejection {
  const checked = checkDuplicateNode(design, id)
  if (checked.isErr()) return checked.error
  const found = findNode(design.layout, id)
  // The check refused the root and any id the layout lacks.
  if (found?.parent === undefined) {
    throw new InvariantError(`Node "${id}" passed its check but has no parent.`)
  }
  const taken = itemIds(design)
  const copies = new Map<string, Id>()
  const copy = (node: Mutable<Node>): Mutable<Node> => {
    const copiedId = copyId(node.id, taken)
    taken.add(copiedId)
    copies.set(node.id, copiedId)
    return isGroup(node)
      ? { ...node, id: copiedId, children: node.children.map(copy) }
      : { ...node, id: copiedId }
  }
  const copied = copy(found.node)
  for (const reference of walkNodeReferences(copied)) {
    const target = copies.get(reference.target)
    if (!isNodeReference(reference) || target === undefined) continue
    // A node reference sits at the node's ['anchor', 'ref']; the copy shares the anchor object
    // with the original, so it gets a new one.
    const node = valueAt(copied, reference.path.slice(0, -2)) as { anchor: object }
    node.anchor = { ...node.anchor, ref: target }
  }
  found.parent.children.splice(found.index + 1, 0, copied)
}
