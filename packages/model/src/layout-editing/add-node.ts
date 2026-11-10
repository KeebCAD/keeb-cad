import type { Design, Mutable, Node, Rejection } from '@keeb-cad/schema'

import { itemIds } from '../ids/item-ids'
import { mintId } from '../ids/mint-id'
import { reject } from '../reject/reject'
import { findNode, isGroup } from './node-tree'
import type { InsertAt, NewNode } from './types'

export function addNode(
  design: Mutable<Design>,
  node: NewNode,
  { parent: parentId, index }: InsertAt,
): void | Rejection {
  const found = parentId === undefined ? { node: design.layout } : findNode(design.layout, parentId)
  if (found === undefined || !isGroup(found.node)) {
    const id = parentId ?? design.layout.id
    return reject('unknown-target', [id], `The design has no group with the id "${id}".`)
  }
  const parent = found.node
  if (index !== undefined && index > parent.children.length) {
    return reject(
      'index-out-of-range',
      [parent.id],
      `The group "${parent.id}" has ${parent.children.length} children, fewer than index ${index}.`,
    )
  }
  if (node.id !== undefined && itemIds(design).has(node.id)) {
    return reject('id-taken', [node.id], `The design already has an item with the id "${node.id}".`)
  }
  const added = { ...node, id: node.id ?? mintId() } as Mutable<Node>
  parent.children.splice(index ?? parent.children.length, 0, added)
}
