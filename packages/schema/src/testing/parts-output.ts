import type { PartsOutput, ResolvedParts } from '../types'

export function aPartsOutput({
  ids = ['stand-in'],
  rows = [{ w: 18, h: 18 }],
}: Partial<PartsOutput> = {}): PartsOutput {
  return { ids, rows }
}

export function aResolvedParts({
  output = aPartsOutput({ ids: [], rows: [] }),
  slots = {},
  violations = [],
}: Partial<ResolvedParts> = {}): ResolvedParts {
  return { output, slots, violations }
}
