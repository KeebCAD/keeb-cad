import { useService } from '@keeb-cad/di/vue'
import { type Ref, watchEffect } from 'vue'

import { CanvasItems } from './canvas-items'

export function useCanvasItemsRoot(
  svg: Readonly<Ref<SVGSVGElement | null>>,
  keys: Readonly<Ref<SVGGElement | null>>,
): void {
  const items = useService(CanvasItems)
  watchEffect(
    (onCleanup) => {
      if (svg.value === null || keys.value === null) return
      const root = { svg: svg.value, keys: keys.value }
      items.registerRoot(root)
      onCleanup(() => {
        items.unregisterRoot(root)
      })
    },
    { flush: 'post' },
  )
}
