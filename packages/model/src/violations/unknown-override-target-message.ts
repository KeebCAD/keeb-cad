import type { ItemId } from '@keeb-cad/schema'

export function unknownOverrideTargetMessage(ids: readonly ItemId[]): string {
  const [target] = ids
  return `The design has no slot to override at "${String(target)}".`
}
