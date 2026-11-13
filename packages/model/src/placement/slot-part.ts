import { InvariantError } from '@keeb-cad/result'
import type { ResolvedParts } from '@keeb-cad/schema'

import type { SlotPart } from './types'

export function slotPart(id: string, parts: ResolvedParts): SlotPart {
  const slot = parts.slots[id as keyof ResolvedParts['slots']]
  const row = slot === undefined ? -1 : parts.output.ids.indexOf(slot.run)
  const rectangle = parts.output.rows[row]
  // Parts and placement read the same layout, so every slot has a run.
  if (slot === undefined || rectangle === undefined) {
    throw new InvariantError(`The slot "${id}" has no part run to place by.`)
  }
  return { row, fit: slot.fit, rectangle }
}
