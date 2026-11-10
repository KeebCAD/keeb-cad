import { DesignStore } from '@keeb-cad/design'
import { useService } from '@keeb-cad/di/vue'
import { nodeIdOf } from '@keeb-cad/model/main'
import { readLayoutRow, readPartsRow } from '@keeb-cad/protocol'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { computed, type ComputedRef } from 'vue'

import type { PlacedNode } from './types'

// The posted Layout set's placed rows, the root left out: it draws no mark of its own.
export function usePlacedNodes(): ComputedRef<PlacedNode[]> {
  const lifecycle = useService(ModelWorkerLifecycle)
  const store = useService(DesignStore)
  return computed(() => {
    const layout = lifecycle.layout.getOrUndefined()?.output
    const parts = lifecycle.parts.getOrUndefined()?.output
    if (layout === undefined || parts === undefined) return []
    const rootId = store.current.map(({ design }) => design.layout.id).getOrUndefined()
    return layout.ids.flatMap((key, index): PlacedNode[] => {
      const row = readLayoutRow(layout, index)
      const id = nodeIdOf(key)
      if (!row.placed || id === rootId) return []
      const common = { id, key, frame: row.frame, anchorAt: row.anchorAt }
      if (row.kind === 'group') return [{ ...common, kind: 'group' }]
      const { w, h } = readPartsRow(parts, row.part)
      return [{ ...common, kind: 'slot', w, h, fit: row.fit }]
    })
  })
}
