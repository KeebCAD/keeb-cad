import { clampZoom } from './clamp-zoom'
import type { CanvasSize, Point, ViewportValue } from './types'
import { screenToModel } from './viewport-transform'

// The model point under `screenPoint` stays under it, the clamped zoom included.
export function zoomAt(
  value: ViewportValue,
  screenPoint: Point,
  factor: number,
  size: CanvasSize,
): ViewportValue {
  const fixed = screenToModel(screenPoint, value, size)
  const zoom = clampZoom(value.zoom * factor)
  return {
    centre: {
      x: fixed.x - (screenPoint.x - size.width / 2) / zoom,
      y: fixed.y + (screenPoint.y - size.height / 2) / zoom,
    },
    zoom,
  }
}
