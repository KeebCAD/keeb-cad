import { useService } from '@keeb-cad/di/vue'
import { computed, type ComputedRef } from 'vue'

import { SwitchGrace } from './switch-grace'

export function useSwitchGrace(): ComputedRef<boolean> {
  const grace = useService(SwitchGrace)
  return computed(() => grace.grayed)
}
