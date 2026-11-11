import type { Design, Id, Mutable, Rejection } from '@keeb-cad/schema'

import { checkDeleteNode } from './check-delete-node'
import { findNode } from './node-tree'

export function deleteNode(design: Mutable<Design>, ids: readonly Id[]): void | Rejection {
  const checked = checkDeleteNode(design, ids)
  if (checked.isErr()) return checked.error
  for (const id of ids) {
    // A node inside a subtree deleted earlier in the list is already gone.
    const found = findNode(design.layout, id)
    found?.parent?.children.splice(found.index, 1)
  }
}
