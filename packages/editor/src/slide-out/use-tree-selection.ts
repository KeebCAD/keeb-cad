import { DesignStore } from '@keeb-cad/design'
import { useService } from '@keeb-cad/di/vue'
import { authoredSide, nodeIdOf, sideQualifiedId } from '@keeb-cad/model/main'
import { idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'
import { computed } from 'vue'

import { Selection } from '../selection/selection'
import type { UseTreeSelectionResult } from './types'

// The Tree has no side: a row is selected when any side of its node is, and selects the authored
// side's id.
export function useTreeSelection(): UseTreeSelectionResult {
  const selection = useService(Selection)
  const store = useService(DesignStore)
  return {
    selected: computed(() => [...new Set(selection.ids.map(nodeIdOf))]),
    // The Tree passes only ids it drew from the design, so one that fails is a bug.
    select: (nodeIds) => {
      const form = store.current.map(({ design }) => design.meta.form).getOrUndefined()
      if (form === undefined) return
      const side = authoredSide(form)
      selection.select(nodeIds.map((id) => sideQualifiedId(side, v.parse(idSchema, id))))
    },
  }
}
