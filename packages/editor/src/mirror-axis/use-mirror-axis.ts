import { DesignStore } from '@keeb-cad/design'
import { useService } from '@keeb-cad/di/vue'
import { sideQualifiedId } from '@keeb-cad/model/main'
import { readLayoutRow } from '@keeb-cad/protocol'
import { Option } from '@keeb-cad/result'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { computed, type ComputedRef } from 'vue'

import type { MirrorAxisFrame } from './types'

// Center's frame while the posted set holds both halves; its y-axis is the mirror axis. Both
// sides' center rows share that axis, and the left is the authored one.
export function useMirrorAxis(): ComputedRef<Option<MirrorAxisFrame>> {
  const lifecycle = useService(ModelWorkerLifecycle)
  const store = useService(DesignStore)
  return computed(() => {
    const layout = lifecycle.layout.getOrUndefined()?.output
    const center = store.current.map(({ design }) => design.layout.id).getOrUndefined()
    if (layout === undefined || center === undefined) return Option.none()
    if (!layout.ids.includes(sideQualifiedId('right', center))) return Option.none()
    const left = layout.ids.indexOf(sideQualifiedId('left', center))
    return left === -1 ? Option.none() : Option.some(readLayoutRow(layout, left).frame)
  })
}
