import { useService } from '@keeb-cad/di/vue'
import { sideOf, sideQualifiedId, subtreeIds, subtreeIdsOf } from '@keeb-cad/model/main'
import type { Id } from '@keeb-cad/schema'
import { computed, type ComputedRef } from 'vue'

import { useOpenDesign } from '../design/use-open-design'
import { Selection } from '../selection/selection'
import { usePlacedNodes } from '../workspace/layout/use-placed-nodes'
import { HoveredGroup } from './hovered-group'
import { tabPoint } from './tab-point'
import type { GroupBorderRow, GroupBorderShown } from './types'

// The placed group rows in the design's pre-order, so a nested group's border lies above its
// ancestors' and the browser's hit test picks the innermost. The root is no placed node.
export function useGroupBorders(): ComputedRef<GroupBorderRow[]> {
  const placed = usePlacedNodes()
  const openDesign = useOpenDesign()
  const selection = useService(Selection)
  const hovered = useService(HoveredGroup)
  return computed(() => {
    const design = openDesign.value
    if (design === undefined) return []
    const order = new Map<string, number>(subtreeIds(design.layout).map((id, index) => [id, index]))
    const placedSlots = new Set(
      placed.value.flatMap(({ kind, key }) => (kind === 'slot' ? [key] : [])),
    )
    const hoveredId = hovered.id.getOrUndefined()
    const shownOf = (id: Id): GroupBorderShown =>
      selection.ids.includes(id) ? 'selected' : hoveredId === id ? 'hovered' : 'none'
    return (
      placed.value
        .flatMap((node) => (node.kind === 'group' ? [node] : []))
        // A row of a set posted before its node was deleted has no place in the order, nor a border to show.
        .filter(({ id }) => order.has(id))
        .toSorted((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
        .map(({ id, key, frame, border }) => {
          const side = sideOf(key)
          const empty = subtreeIdsOf(design.layout, [id]).every(
            (node) => !placedSlots.has(sideQualifiedId(side, node)),
          )
          return {
            id,
            key,
            frame,
            outers: border.map(({ outer }) => outer),
            empty,
            tabAt: tabPoint(border),
            shown: shownOf(id),
          }
        })
    )
  })
}
