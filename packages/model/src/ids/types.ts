import type { Id } from '@keeb-cad/schema'

export type PlacementSide = 'left' | 'right' | 'whole'

// `at` is the length of the node's own path.
export interface NodeAtPath {
  id: Id
  at: number
}
