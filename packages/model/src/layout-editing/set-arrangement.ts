import type { Design, Id, Mutable } from '@keeb-cad/schema'

import { arrangeGroup } from './arrange-group'
import { findNode, isGroup } from './node-tree'
import type { ArrangementEdit } from './types'

// Unchecked: an id that names no group is skipped.
export function setArrangement(
  design: Mutable<Design>,
  ids: readonly Id[],
  edit: ArrangementEdit,
): void {
  for (const id of new Set(ids)) {
    const found = findNode(design.layout, id)
    if (found !== undefined && isGroup(found.node)) arrangeGroup(found.node, edit)
  }
}
