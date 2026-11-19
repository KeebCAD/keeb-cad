import { compareCodeUnits, type PartsOutput } from '@keeb-cad/schema'

import type { SlotSpace } from './types'

export function partsOutputOf(slotSpaces: ReadonlyMap<string, SlotSpace>): PartsOutput {
  const ids = [...slotSpaces.keys()].toSorted(compareCodeUnits)
  return { ids, rows: ids.map((id) => slotSpaces.get(id) as SlotSpace) }
}
