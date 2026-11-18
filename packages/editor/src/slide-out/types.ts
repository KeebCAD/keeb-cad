import type { Id } from '@keeb-cad/schema'
import type * as v from 'valibot'
import type { ComputedRef, WritableComputedRef } from 'vue'

import type { showSlideOutTabInputSchema } from './show-slide-out-tab-input-schema'
import type { slideOutTabSchema } from './slide-out-tab-schema'
import type { toggleSlideOutTabInputSchema } from './toggle-slide-out-tab-input-schema'

export type SlideOutTab = v.InferOutput<typeof slideOutTabSchema>

export type ToggleSlideOutTabInput = v.InferOutput<typeof toggleSlideOutTabInputSchema>

export type ShowSlideOutTabInput = v.InferOutput<typeof showSlideOutTabInputSchema>

export type UseSlideOutResult = {
  isOpen: ComputedRef<boolean>
  tab: ComputedRef<SlideOutTab>
  returnFocus: (slideOut: HTMLElement | null) => void
}

export type UseSlideOutTabResult = {
  tab: WritableComputedRef<SlideOutTab, string | undefined>
  tabs: readonly SlideOutTabItem[]
}

export type SlideOutTabItem = { value: SlideOutTab; label: string }

export type UseTreeSelectionResult = {
  // Node ids, any side of which is selected.
  selected: ComputedRef<readonly Id[]>
  select: (nodeIds: readonly string[]) => void
}
