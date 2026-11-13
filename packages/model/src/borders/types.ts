import type { LayoutRow } from '../placement/types'

// A placed slot's row under a group, with the levels from the slot's own group up to that group,
// both counted.
export interface SlotAtLevel {
  row: LayoutRow
  levels: number
}
