import { compose, type Matrix, rotation, translation } from '@keeb-cad/geometry'

import type { ReadOffset } from './types'

// The anchor frame, then the offset's move, then its turn about the pivot in the node's own frame.
export function placeSlot(
  anchor: Matrix,
  { position, rotation: degrees, pivot }: ReadOffset,
): Matrix {
  const moved = compose(anchor, translation(position.x, position.y))
  const toPivot = compose(moved, translation(pivot.x, pivot.y))
  return compose(compose(toPivot, rotation(degrees)), translation(-pivot.x, -pivot.y))
}
