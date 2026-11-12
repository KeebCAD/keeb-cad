import { useService } from '@keeb-cad/di/vue'
import type { ComputedRef } from 'vue'
import { computed } from 'vue'

import { Flows } from './flows'
import type { FlowHostView } from './types'

export function useFlowHost(): ComputedRef<FlowHostView | undefined> {
  const flows = useService(Flows)
  return computed(() => {
    const open = flows.top.getOrUndefined()
    const view = open?.entry.handle.view
    return open === undefined || view === undefined ? undefined : { view, entry: open.entry }
  })
}
