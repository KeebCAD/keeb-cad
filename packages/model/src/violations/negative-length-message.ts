import type { ItemId } from '@keeb-cad/schema'

export function negativeLengthMessage(ids: readonly ItemId[]): string {
  const [item] = ids
  return `The length of "${String(item)}" is below 0 mm.`
}
