import { useService } from '@keeb-cad/di/vue'
import { formatNumber } from '@keeb-cad/ui'
import { computed, type ComputedRef } from 'vue'

import { CanvasCursor } from '../viewport/canvas-cursor'

// Dashes while the pointer is off the canvas: blank reads as broken, the last position as live.
export function useCursorReadout(): ComputedRef<string> {
  const cursor = useService(CanvasCursor)
  return computed(() =>
    cursor.model.match({
      some: ({ x, y }) => `x ${readout(x)} y ${readout(y)}`,
      none: () => 'x – y –',
    }),
  )
}

function readout(value: number): string {
  return formatNumber(value, 'none', { readout: true })
}
