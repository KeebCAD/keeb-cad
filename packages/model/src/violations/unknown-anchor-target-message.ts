import type { ItemId } from '@keeb-cad/schema'

export function unknownAnchorTargetMessage(ids: readonly ItemId[]): string {
  const [target] = ids
  return `The design has nothing of the right kind with the id "${String(target)}".`
}
