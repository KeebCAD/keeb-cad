import { InvariantError } from '@keeb-cad/result'
import type { Design, Id, Mutable, Node, Rejection } from '@keeb-cad/schema'

import { itemIds } from '../ids/item-ids'
import { checkDuplicateNode } from './check-duplicate-node'
import { copyId } from './copy-id'
import { findNode, isGroup } from './node-tree'

export function duplicateNode(design: Mutable<Design>, id: Id): void | Rejection {
  const checked = checkDuplicateNode(design, id)
  if (checked.isErr()) return checked.error
  const found = findNode(design.layout, id)
  // The check refused the root and any id the layout lacks.
  if (found?.parent === undefined) {
    throw new InvariantError(`Node "${id}" passed its check but has no parent.`)
  }
  const taken = itemIds(design)
  const copy = (node: Mutable<Node>): Mutable<Node> => {
    const copiedId = copyId(node.id, taken)
    taken.add(copiedId)
    return isGroup(node)
      ? { ...node, id: copiedId, children: node.children.map(copy) }
      : { ...node, id: copiedId }
  }
  found.parent.children.splice(found.index + 1, 0, copy(found.node))
}
