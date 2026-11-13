import type { Border } from '../types'

export function aBorder(regions: Border = [aBorderRegion()]): Border {
  return regions
}

// A counter-clockwise 1 × 1 square at the origin.
export function aBorderRegion({
  outer = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ],
  holes = [],
}: Partial<Border[number]> = {}): Border[number] {
  return { outer, holes }
}
