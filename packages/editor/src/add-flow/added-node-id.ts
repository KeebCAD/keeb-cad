import type { AddSlotInput } from '@keeb-cad/commands'
import { lastChildId } from '@keeb-cad/model/main'
import { InvariantError } from '@keeb-cad/result'
import type { Design, Frozen, Id } from '@keeb-cad/schema'

// A typed id names the node; a minted one is only known as the child the command appended.
export function addedNodeId(
  design: Frozen<Design>,
  { id, parent = design.layout.id }: Pick<AddSlotInput, 'id' | 'parent'>,
): Id {
  if (id !== undefined) return id
  const appended = lastChildId(design.layout, parent)
  if (appended.isNone()) {
    throw new InvariantError(`The add flow appended no child to "${parent}".`)
  }
  return appended.value
}
