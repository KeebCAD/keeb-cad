import { InvariantError } from '@keeb-cad/result'
import type { Anchor, Design, Id, Mutable, Rejection } from '@keeb-cad/schema'

import { checkSetAnchor } from './check-set-anchor'
import { findNode } from './node-tree'

// No anchor puts the node back on its default; the offset stays as written either way.
export function setAnchor(
  design: Mutable<Design>,
  id: Id,
  anchor: Anchor | undefined,
): void | Rejection {
  const checked = checkSetAnchor(design, id, anchor)
  if (checked.isErr()) return checked.error
  const found = findNode(design.layout, id)
  // The check refused any id the layout lacks.
  if (found === undefined) throw new InvariantError(`Node "${id}" passed its check but is gone.`)
  if (anchor === undefined) {
    delete found.node.anchor
  } else {
    found.node.anchor = anchor
  }
}
