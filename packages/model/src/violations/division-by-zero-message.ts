import type { ItemId } from '@keeb-cad/schema'

export function divisionByZeroMessage(ids: readonly ItemId[]): string {
  const [item] = ids
  return `The expression of "${String(item)}" divides by zero.`
}
