import type { PartsOutput, ResolvedParts } from '../types'
import { aSlotSpace } from './polygon-region'

export function aPartsOutput({
  ids = ['stand-in'],
  rows = [aSlotSpace()],
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
