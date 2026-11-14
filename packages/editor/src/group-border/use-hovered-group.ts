import { DesignStore } from '@keeb-cad/design'
import { useService } from '@keeb-cad/di/vue'
import {
  authoredSide,
  nearestGroupId,
  nodeIdOf,
  sideOf,
  sideQualifiedId,
} from '@keeb-cad/model/main'
import { idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

import { HoveredGroup } from './hovered-group'
import type { UseHoveredGroupResult } from './types'

export function useHoveredGroup(): UseHoveredGroupResult {
  const hovered = useService(HoveredGroup)
  const store = useService(DesignStore)
  return {
    pointAtGroup: (key) => {
      hovered.point(key, 'canvas')
    },
    // The Tree has no side, so its row points at the authored side's group. It passes only ids it
    // drew from the design, so one that fails is a bug.
    pointAtTreeGroup: (nodeId) => {
      const id = v.parse(idSchema, nodeId)
      const form = store.current.map(({ design }) => design.meta.form).getOrUndefined()
      if (form !== undefined) hovered.point(sideQualifiedId(authoredSide(form), id), 'tree')
    },
    pointAtSlot: (key) => {
      const group = store.current.flatMap(({ design }) =>
        nearestGroupId(design.layout, nodeIdOf(key)),
      )
      group.match({
        some: (id) => {
          hovered.point(sideQualifiedId(sideOf(key), id), 'canvas')
        },
        none: () => {
          hovered.leave()
        },
      })
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
