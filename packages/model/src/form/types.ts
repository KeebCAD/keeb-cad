import type { PlacementSide } from '../ids/types'

// Never empty, so the first is always there.
export type PlacementSides = readonly [PlacementSide, ...PlacementSide[]]
