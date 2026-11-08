import { useService } from '@keeb-cad/di/vue'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { computed, type ComputedRef } from 'vue'

export function useWorkerFailure(): ComputedRef<string | undefined> {
  const lifecycle = useService(ModelWorkerLifecycle)
  return computed(() => {
    const status = lifecycle.status
    if (typeof status === 'string') return
    return status.stage === undefined
      ? `failed: ${status.message}`
      : `failed: ${status.stage}: ${status.message}`
  })
}
