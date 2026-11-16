import { useService } from '@keeb-cad/di/vue'
import { formatNumber } from '@keeb-cad/ui'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { useTimeoutFn } from '@vueuse/core'
import { computed, type ComputedRef, shallowRef, watch } from 'vue'

import { SHOWN_AFTER_MS, toNextChange } from './running-stage-timing'
import type { ShownRunningStage } from './types'

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
