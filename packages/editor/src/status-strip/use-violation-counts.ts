import { DesignStore } from '@keeb-cad/design'
import { useService } from '@keeb-cad/di/vue'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { computed, type ComputedRef } from 'vue'

import type { ViolationCounts } from './types'

export function useViolationCounts(): ComputedRef<ViolationCounts> {
  const lifecycle = useService(ModelWorkerLifecycle)
  const store = useService(DesignStore)
  return computed(() => {
    const posted = lifecycle.issues.getOrUndefined()
    const mainSeq = store.current.map(({ seq }) => seq).getOrUndefined()
    const violations = posted?.violations ?? []
    return {
      errors: violations.filter(({ severity }) => severity === 'error').length,
      warnings: violations.filter(({ severity }) => severity === 'warning').length,
      dimmed: posted === undefined || (mainSeq !== undefined && posted.seq < mainSeq),
    }
  })
}
