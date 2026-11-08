import type { ComputedRef } from 'vue'

export type UseSlideOutResult = {
  isOpen: ComputedRef<boolean>
  returnFocus: (slideOut: HTMLElement | null) => void
}
