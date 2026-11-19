import type { FoundPart } from '../part-levels/types'
import { slotSpaceOutputOf } from './parts-lane-calls'
import type { PartRun, SlotSpace } from './types'

export function slotSpaceOf(result: PartRun['result'], found: FoundPart): SlotSpace | undefined {
  if (result.isErr()) return undefined
  const name = slotSpaceOutputOf(found.declaration)
  return name === undefined ? undefined : (result.value.outputs[name] as SlotSpace)
}
