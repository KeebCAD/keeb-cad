import { sideOf } from '@keeb-cad/model/main'
import type { PlacementId } from '@keeb-cad/schema'

// The right half is select-only: an operation that changes the authored node behind a selected
// id would change both halves, so it is unavailable while the selection holds a right id.
export function selectsRightHalf(ids: readonly PlacementId[]): boolean {
  return ids.some((id) => sideOf(id) === 'right')
}
