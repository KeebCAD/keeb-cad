import type { PlacementId } from '@keeb-cad/schema'
import type { ComputedRef } from 'vue'

export type UseSelectionResult = {
  ids: ComputedRef<readonly PlacementId[]>
  select: (ids: readonly PlacementId[]) => void
}
