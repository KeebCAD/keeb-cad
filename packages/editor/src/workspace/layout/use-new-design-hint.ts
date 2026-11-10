import { DesignStore } from '@keeb-cad/design'
import { useService } from '@keeb-cad/di/vue'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { computed, type ComputedRef, type Ref } from 'vue'

import { holdsSlot } from './holds-slot'
import type { PlacedNode } from './types'

// Before the first set the design decides, so a stored design with keys never reads as empty while
// the worker starts; once a set is posted, its placed slots decide.
export function useNewDesignHint(
  placed: Readonly<Ref<readonly PlacedNode[]>>,
): ComputedRef<boolean> {
  const lifecycle = useService(ModelWorkerLifecycle)
  const store = useService(DesignStore)
  return computed(() => {
    if (lifecycle.layout.isSome()) return placed.value.every(({ kind }) => kind !== 'slot')
    const design = store.current.map((committed) => committed.design).getOrUndefined()
    return design === undefined || !holdsSlot(design.layout)
  })
}
