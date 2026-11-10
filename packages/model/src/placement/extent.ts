import { apply } from '@keeb-cad/geometry'

import type { Extent, PlacedRectangle } from './types'

// The low and high ends along an axis of rectangles taken together, each turned by its frame.
// No rectangle is a point at the origin.
export function extent(rectangles: readonly PlacedRectangle[], axis: 'x' | 'y'): Extent {
  const ends = rectangles.flatMap(({ frame, w, h }) =>
    [
      { x: -w / 2, y: -h / 2 },
      { x: w / 2, y: -h / 2 },
      { x: w / 2, y: h / 2 },
      { x: -w / 2, y: h / 2 },
    ].map((corner) => apply(frame, corner)[axis]),
  )
  return ends.length === 0
    ? { near: 0, far: 0 }
    : { near: Math.min(...ends), far: Math.max(...ends) }
}
