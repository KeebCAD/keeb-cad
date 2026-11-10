import { useService } from '@keeb-cad/di/vue'
import { computed, type Ref } from 'vue'

import type { CanvasSize, UseViewportResult } from './types'
import { Viewport } from './viewport'
import { modelToScreen, viewportTransform } from './viewport-transform'

export function useViewport(size: Readonly<Ref<CanvasSize>>): UseViewportResult {
  const viewport = useService(Viewport)
  return {
    transform: computed(() => viewportTransform(viewport.value, size.value)),
    modelToScreen: (point) => modelToScreen(point, viewport.value, size.value),
    fitOnce: (designId, bounds) => {
      viewport.fitOnce(designId, bounds, size.value)
    },
  }
}
