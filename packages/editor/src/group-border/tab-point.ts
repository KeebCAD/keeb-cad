import { Option } from '@keeb-cad/result'
import type { Border } from '@keeb-cad/schema'

import type { Point } from '../viewport/types'

// The topmost posted point of every region's outer loop, the leftmost of a tie. Points are posted
// rounded, so a flat top edge's ends compare equal.
export function tabPoint(border: Border): Option<Point> {
  const points = border.flatMap(({ outer }) => outer)
  const top = points.reduce<Point | undefined>(
    (best, point) =>
      best === undefined || point.y > best.y || (point.y === best.y && point.x < best.x)
        ? point
        : best,
    undefined,
  )
  return Option.fromNullable(top).map(({ x, y }) => ({ x, y }))
}
