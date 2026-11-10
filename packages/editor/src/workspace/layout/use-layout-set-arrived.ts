import { useService } from '@keeb-cad/di/vue'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { computed, type ComputedRef } from 'vue'

// Whether the drawn Layout set is the one for main's latest seq, so the open design's own.
export function useLayoutSetArrived(): ComputedRef<boolean> {
  const lifecycle = useService(ModelWorkerLifecycle)
  return computed(() => lifecycle.layoutSetArrived)
}
