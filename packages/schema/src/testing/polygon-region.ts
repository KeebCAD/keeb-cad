import type { PolygonRegion } from '../types'

// A counter-clockwise 1 × 1 square at the origin.
export function aPolygonRegion({
  outer = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ],
  holes = [],
}: Partial<PolygonRegion> = {}): PolygonRegion {
  return { outer, holes }
}

// A rectangle centred on the slot's frame, outer counter-clockwise from its bottom-left corner.
export function aSlotSpace({ width = 18, height = 18 } = {}): PolygonRegion[] {
  const x = width / 2
  const y = height / 2
  return [
    aPolygonRegion({
      outer: [
        { x: -x, y: -y },
        { x, y: -y },
        { x, y },
        { x: -x, y },
      ],
    }),
  ]
}
