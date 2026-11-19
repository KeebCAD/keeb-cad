import {
  apply,
  compose,
  type Point,
  reflectionAcrossY,
  rotation,
  translation,
} from '@keeb-cad/geometry'
import type { PolygonRegion } from '@keeb-cad/schema'

import type { SlotSpace } from '../parts/types'
import type { LayoutRow } from '../placement/types'

// A reflection flips every loop's winding, so a mirrored slot space's loops are reversed to keep
// outer loops counter-clockwise and holes clockwise.
export function placedSlotSpace(
  { x, y, rot, mirrored }: LayoutRow['frame'],
  slotSpace: SlotSpace,
): PolygonRegion[] {
  const turned = compose(translation(x, y), rotation(rot))
  const placing = mirrored ? compose(turned, reflectionAcrossY()) : turned
  const placeLoop = (loop: readonly Point[]) => {
    const placed = loop.map((point) => apply(placing, point))
    return mirrored ? placed.toReversed() : placed
  }
  return slotSpace.map(({ outer, holes }) => ({
    outer: placeLoop(outer),
    holes: holes.map(placeLoop),
  }))
}
