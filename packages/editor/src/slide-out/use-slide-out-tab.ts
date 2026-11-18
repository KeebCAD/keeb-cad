import { useService } from '@keeb-cad/di/vue'
import * as v from 'valibot'
import { computed } from 'vue'

import { useInvoke } from '../invoke/use-invoke'
import { ShowSlideOutTab } from './show-slide-out-tab'
import { SlideOut } from './slide-out'
import { slideOutTabSchema } from './slide-out-tab-schema'
import type { SlideOutTabItem, UseSlideOutTabResult } from './types'

const TABS: readonly SlideOutTabItem[] = [
  { value: 'tree', label: 'Tree' },
  { value: 'parameters', label: 'Parameters' },
]

export function useSlideOutTab(): UseSlideOutTabResult {
  const slideOut = useService(SlideOut)
  const { invoke } = useInvoke()
  // Setting it switches through the tab's own entry, as a rail button does.
  const tab = computed({
    get: () => slideOut.tab,
    set: (value: string | undefined) => {
      if (v.is(slideOutTabSchema, value)) void invoke(ShowSlideOutTab, { tab: value })
    },
  })
  return { tab, tabs: TABS }
}
