import { DesignStore } from '@keeb-cad/design'
import { useService } from '@keeb-cad/di/vue'
import type { Design, Frozen } from '@keeb-cad/schema'
import { computed, type ComputedRef } from 'vue'

export function useOpenDesign(): ComputedRef<Frozen<Design> | undefined> {
  const store = useService(DesignStore)
  return computed(() => store.current.map((committed) => committed.design).getOrUndefined())
}
