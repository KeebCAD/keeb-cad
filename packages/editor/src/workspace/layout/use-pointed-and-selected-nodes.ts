import { useService } from '@keeb-cad/di/vue'
import { computed, type ComputedRef } from 'vue'

import { HoveredNode } from '../../hover/hovered-node'
import { Selection } from '../../selection/selection'
import type { PlacedNode } from './types'
import { usePlacedNodes } from './use-placed-nodes'

// The placed nodes that are selected or hovered, in placed order, each once. Read from the placed
// rows, so an id with no placed posted row shows nothing.
export function usePointedAndSelectedNodes(): ComputedRef<PlacedNode[]> {
  const placed = usePlacedNodes()
  const selection = useService(Selection)
  const hovered = useService(HoveredNode)
  return computed(() => {
    const pointed = hovered.id.map((id) => [id]).getOr([])
    const shown = new Set<string>([...selection.ids, ...pointed])
    return placed.value.filter(({ key }) => shown.has(key))
  })
}
