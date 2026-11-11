import { useService } from '@keeb-cad/di/vue'
import type { Id } from '@keeb-cad/schema'
import { type MaybeRefOrGetter, toValue, watchEffect } from 'vue'

import { CanvasItems } from './canvas-items'

export function useCanvasItem(
  id: MaybeRefOrGetter<Id>,
  element: MaybeRefOrGetter<Element | null | undefined>,
): void {
  const items = useService(CanvasItems)
  watchEffect(
    (onCleanup) => {
      const drawn = toValue(element)
      if (!(drawn instanceof SVGGraphicsElement)) return
      const item = { id: toValue(id), element: drawn }
      items.register(item)
      onCleanup(() => {
        items.unregister(item)
      })
    },
    { flush: 'post' },
  )
}
