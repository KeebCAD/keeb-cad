import type { Id } from '@keeb-cad/schema'
import type { ComputedRef } from 'vue'

export type UseSelectionResult = {
  ids: ComputedRef<readonly Id[]>
  select: (ids: readonly string[]) => void
}
