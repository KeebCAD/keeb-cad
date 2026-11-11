import { useService } from '@keeb-cad/di/vue'
import { computed, type ComputedRef } from 'vue'

import { Viewport } from '../viewport/viewport'
import { zoomReadout } from './zoom-readout'

export function useZoomReadout(): ComputedRef<string> {
  const viewport = useService(Viewport)
  return computed(() => zoomReadout(viewport.zoom))
}
