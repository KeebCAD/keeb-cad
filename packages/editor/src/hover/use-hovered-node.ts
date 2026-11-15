import { DesignStore } from '@keeb-cad/design'
import { useService } from '@keeb-cad/di/vue'
import { authoredSide, sideQualifiedId } from '@keeb-cad/model/main'
import { idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

import { HoveredNode } from './hovered-node'
import type { UseHoveredNodeResult } from './types'

export function useHoveredNode(): UseHoveredNodeResult {
  const hovered = useService(HoveredNode)
  const store = useService(DesignStore)
  return {
    pointAt: (placement) => {
      hovered.point(placement, 'canvas')
    },
    // The Tree has no side, so its row points at the authored side's group. It passes only ids it
    // drew from the design, so one that fails is a bug.
    pointAtTreeGroup: (nodeId) => {
      const id = v.parse(idSchema, nodeId)
      const form = store.current.map(({ design }) => design.meta.form).getOrUndefined()
      if (form !== undefined) hovered.point(sideQualifiedId(authoredSide(form), id), 'tree')
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
