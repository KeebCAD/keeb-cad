import type { LayoutOutput } from '../types'

export function aLayoutOutput({ ids = [], rows = [] }: Partial<LayoutOutput> = {}): LayoutOutput {
  return { ids, rows }
}

// A placed, fitted slot at the origin on the parts output's first row.
export function aLayoutRow({
  kind = 'slot',
  frame = { x: 0, y: 0, rot: 0, mirrored: false },
  anchorAt = { x: 0, y: 0 },
  part = 0,
  fit = 'fitted',
  placed = true,
}: Partial<LayoutOutput['rows'][number]> = {}): LayoutOutput['rows'][number] {
  return { kind, frame, anchorAt, part, fit, placed }
}
