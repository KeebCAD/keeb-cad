import type { Id } from '@keeb-cad/schema'
import type { ComputedRef } from 'vue'

export type UseSlideOutResult = {
  isOpen: ComputedRef<boolean>
  returnFocus: (slideOut: HTMLElement | null) => void
}

export type UseTreeSelectionResult = {
  // Node ids, any side of which is selected.
  selected: ComputedRef<readonly Id[]>
  select: (nodeIds: readonly string[]) => void
}
