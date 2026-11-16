import type { ItemId } from '@keeb-cad/schema'

export function unknownNodeMessage(ids: readonly ItemId[]): string {
  const named = ids.map((id) => `"${String(id)}"`).join(', ')
  return `The design has no node with the id ${named}.`
}
