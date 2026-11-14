import { useService } from '@keeb-cad/di/vue'
import { computed } from 'vue'

import { Selection } from './selection'
import type { UseSelectionResult } from './types'

export function useSelection(): UseSelectionResult {
  const selection = useService(Selection)
  return {
    ids: computed(() => selection.ids),
    select: (ids) => {
      selection.select(ids)
    },
  }
}
