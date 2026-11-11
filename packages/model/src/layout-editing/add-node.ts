import { InvariantError } from '@keeb-cad/result'
import type { Design, Mutable, Node, Rejection } from '@keeb-cad/schema'

import { mintId } from '../ids/mint-id'
import { checkAddNode } from './check-add-node'
import { findNode, isGroup } from './node-tree'
import type { InsertAt, NewNode } from './types'

export function addNode(design: Mutable<Design>, node: NewNode, at: InsertAt): void | Rejection {
  const checked = checkAddNode(design, node.id, at)
  if (checked.isErr()) return checked.error
  const parent = at.parent === undefined ? design.layout : findNode(design.layout, at.parent)?.node
  // The check refused a parent that is missing or a slot.
  if (parent === undefined || !isGroup(parent)) {
    throw new InvariantError(`Parent "${at.parent}" passed its check but is no group.`)
  }
  const added = { ...node, id: node.id ?? mintId() } as Mutable<Node>
  parent.children.splice(at.index ?? parent.children.length, 0, added)
}
