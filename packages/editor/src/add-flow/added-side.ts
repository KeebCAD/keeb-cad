import { authoredSide, type PlacementSide, sideOf } from '@keeb-cad/model/main'
import type { Design, Frozen, PlacementId } from '@keeb-cad/schema'

// The side the person was on, read as parentForSelection reads the parent: from the only selected
// id, else the authored side.
export function addedSide(design: Frozen<Design>, selected: readonly PlacementId[]): PlacementSide {
  const [only, ...others] = selected
  return only === undefined || others.length > 0 ? authoredSide(design.meta.form) : sideOf(only)
}
