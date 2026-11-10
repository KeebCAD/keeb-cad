import type { Design, Id, Mutable, Node, Rejection } from '@keeb-cad/schema'

import { itemIds } from '../ids/item-ids'
import { reject } from '../reject/reject'
import { copyId } from './copy-id'
import { findNode, isGroup } from './node-tree'

export function duplicateNode(design: Mutable<Design>, id: Id): void | Rejection {
  if (id === design.layout.id) {
    return reject('root-required', [id], `The root group "${id}" can't be duplicated.`)
  }
  const found = findNode(design.layout, id)
  if (found?.parent === undefined) {
    return reject('unknown-target', [id], `The design has no node with the id "${id}".`)
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
