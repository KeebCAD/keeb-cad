import { signedArea } from './signed-area'
import type { Point, PolygonRegion } from './types'

const MIN_LOOP_POINTS = 3

export function isWellFormed(regions: readonly PolygonRegion[]): boolean {
  return (
    regions.length > 0 &&
    regions.every(
      ({ outer, holes }) =>
        isLoop(outer) &&
        signedArea(outer) > 0 &&
        holes.every((hole) => isLoop(hole) && signedArea(hole) < 0),
    )
  )
}

function isLoop(loop: readonly Point[]): boolean {
  const first = loop[0] as Point
  const last = loop.at(-1) as Point
  return loop.length >= MIN_LOOP_POINTS && (first.x !== last.x || first.y !== last.y)
}
