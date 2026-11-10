import type { LayoutOutput } from '../types'

export function aLayoutOutput({ ids = [], rows = [] }: Partial<LayoutOutput> = {}): LayoutOutput {
  return { ids, rows }
}
