import { useService } from '@keeb-cad/di/vue'
import { formatNumber } from '@keeb-cad/ui'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { useTimeoutFn } from '@vueuse/core'
import { computed, type ComputedRef, shallowRef, watch } from 'vue'

import type { ShownRunningStage } from './types'

const SHOWN_AFTER_MS = 1000

function toNextChange(elapsed: number): number {
  const next =
    elapsed <= SHOWN_AFTER_MS ? SHOWN_AFTER_MS + 1 : (Math.floor(elapsed / 1000) + 1) * 1000
  return next - elapsed
}

export function useRunningStage(): ComputedRef<ShownRunningStage | undefined> {
  const lifecycle = useService(ModelWorkerLifecycle)
  const running = computed(() => lifecycle.runningStage.getOrUndefined())
  const elapsed = shallowRef(0)
  const delay = shallowRef(0)

  const { start, stop } = useTimeoutFn(refresh, delay, { immediate: false })

  function refresh(): void {
    const current = running.value
    if (current === undefined) {
      stop()
      return
    }
    elapsed.value = performance.now() - current.arrivedAt
    delay.value = toNextChange(elapsed.value)
    start()
  }

  watch(running, refresh, { immediate: true })

  return computed(() => {
    const current = running.value
    if (current === undefined || elapsed.value <= SHOWN_AFTER_MS) return
    return {
      stage: current.stage,
      elapsed: formatNumber(Math.floor(elapsed.value / 1000), 's'),
    }
  })
}
