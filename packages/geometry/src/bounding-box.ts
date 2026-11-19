import type { Box, PolygonRegion } from './types'

// No regions is a point at the origin, as a group with no placed slots is.
export function boundingBox(regions: readonly PolygonRegion[]): Box {
  const points = regions.flatMap(({ outer, holes }) => [...outer, ...holes.flat()])
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  const xs = points.map(({ x }) => x)
  const ys = points.map(({ y }) => y)
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  }
}
