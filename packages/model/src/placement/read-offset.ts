import type { Frozen, Offset, Vec2 } from '@keeb-cad/schema'

import { literalValue } from './literal-value'
import type { ReadOffset } from './types'

export function readOffset(offset: Frozen<Offset> | undefined): ReadOffset {
  return {
    position: point(offset?.position),
    rotation: offset?.rotation === undefined ? 0 : literalValue(offset.rotation),
    pivot: point(offset?.pivot),
  }
}

function point(vector: Frozen<Vec2> | undefined) {
  return vector === undefined
    ? { x: 0, y: 0 }
    : { x: literalValue(vector.x), y: literalValue(vector.y) }
}
