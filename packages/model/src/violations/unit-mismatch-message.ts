import type { ItemId } from '@keeb-cad/schema'

export function unitMismatchMessage(ids: readonly ItemId[]): string {
  const [item] = ids
  return `The expression of "${String(item)}" has the wrong unit.`
}
