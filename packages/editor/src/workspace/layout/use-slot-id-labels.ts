import { useService } from '@keeb-cad/di/vue'
import { type Ref, type ShallowRef, shallowRef, watchEffect } from 'vue'

import { CanvasItems } from '../../viewport/canvas-items'
import type { Point } from '../../viewport/types'
import type { PlacedNode, SlotIdLabelAt } from './types'

// Each shown slot's label point under the key as the browser drew it, so a turned key's corner
// never covers its label. The viewport has no rotation, so the bounds' lowest model y is the
// lowest point on screen. Read after the render, once the key's new frame is drawn.
export function useSlotIdLabels(
  shown: Readonly<Ref<readonly PlacedNode[]>>,
  modelToScreen: (point: Point) => Point,
): Readonly<ShallowRef<SlotIdLabelAt[]>> {
  const items = useService(CanvasItems)
  const labels = shallowRef<SlotIdLabelAt[]>([])
  watchEffect(
    () => {
      labels.value = shown.value.flatMap(({ kind, key, id }): SlotIdLabelAt[] =>
        kind === 'slot'
          ? items
              .bounds([key])
              .map(({ x, y, width }) => [{ key, id, at: modelToScreen({ x: x + width / 2, y }) }])
              .getOr([])
          : [],
      )
    },
    { flush: 'post' },
  )
  return labels
}
