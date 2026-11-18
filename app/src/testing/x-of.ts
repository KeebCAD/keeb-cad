import type { LayoutOutput } from '@keeb-cad/schema'

export function xOf(placements: LayoutOutput, id: string): number {
  return placements.rows[placements.ids.indexOf(id)]?.frame.x ?? NaN
}
