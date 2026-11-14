import { DesignStore } from '@keeb-cad/design'
import { useService } from '@keeb-cad/di/vue'
import { nearestGroupId } from '@keeb-cad/model/main'
import { type Id, idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

import { HoveredGroup } from './hovered-group'
import type { UseHoveredGroupResult } from './types'

export function useHoveredGroup(): UseHoveredGroupResult {
  const hovered = useService(HoveredGroup)
  const store = useService(DesignStore)
  return {
    // The canvas and the tree pass only ids they drew from the design, so one that fails is a bug.
    pointAtGroup: (id) => {
      hovered.point(v.parse(idSchema, id), 'canvas')
    },
    pointAtTreeGroup: (id) => {
      hovered.point(v.parse(idSchema, id), 'tree')
    },
    pointAtSlot: (slotId: Id) => {
      const group = store.current.flatMap(({ design }) => nearestGroupId(design.layout, slotId))
      group.match({ some: (id) => hovered.point(id, 'canvas'), none: () => hovered.leave() })
    },
    leave: () => {
      hovered.leave()
    },
    clear: () => {
      hovered.clear()
    },
    clearTreeHover: () => {
      hovered.clearSetBy('tree')
    },
  }
}
