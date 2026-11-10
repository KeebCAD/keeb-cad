import { useService } from '@keeb-cad/di/vue'
import { idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'
import { computed } from 'vue'

import { Selection } from './selection'
import type { UseSelectionResult } from './types'

export function useSelection(): UseSelectionResult {
  const selection = useService(Selection)
  return {
    ids: computed(() => selection.ids),
    // The canvas and the tree pass only ids they drew from the design, so one that fails is a bug.
    select: (ids) => {
      selection.select(ids.map((id) => v.parse(idSchema, id)))
    },
  }
}
