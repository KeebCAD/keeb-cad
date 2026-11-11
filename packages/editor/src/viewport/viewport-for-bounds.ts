import { Option } from '@keeb-cad/result'

import type { Bounds, CanvasSize, ViewportValue } from './types'

// None for bounds with no extent, or a canvas side no larger than both paddings, which would give
// an infinite, zero or negative zoom. The zoom is left unclamped: the viewport clamps it.
export function viewportForBounds(
  bounds: Bounds,
  size: CanvasSize,
  padding: number,
): Option<ViewportValue> {
  const room = { width: size.width - 2 * padding, height: size.height - 2 * padding }
  if (room.width <= 0 || room.height <= 0) return Option.none()
  const zooms = [
    ...(bounds.width > 0 ? [room.width / bounds.width] : []),
    ...(bounds.height > 0 ? [room.height / bounds.height] : []),
  ]
  if (zooms.length === 0) return Option.none()
  return Option.some({
    centre: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    zoom: Math.min(...zooms),
  })
}
