import type { Point, ViewportValue } from './types'

// The drawing follows the screen delta, so the centre moves against it; screen y points down.
export function panBy(value: ViewportValue, screenDelta: Point): ViewportValue {
  return {
    centre: {
      x: value.centre.x - screenDelta.x / value.zoom,
      y: value.centre.y + screenDelta.y / value.zoom,
    },
    zoom: value.zoom,
  }
}
