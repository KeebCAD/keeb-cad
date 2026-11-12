import { nearestGroupId } from '@keeb-cad/model/main'
import type { Design, Frozen, Id } from '@keeb-cad/schema'

// Several selected nodes go to the root, as none do, until multi-selection decides otherwise.
export function parentForSelection(design: Frozen<Design>, selected: readonly Id[]): Id {
  const root = design.layout.id
  const [only, ...others] = selected
  return only === undefined || others.length > 0
    ? root
    : nearestGroupId(design.layout, only).getOr(root)
}
