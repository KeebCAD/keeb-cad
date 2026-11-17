import type { ItemId } from '@keeb-cad/schema'

export function expressionTooLongMessage(
  from: string,
  to: string,
  items: readonly ItemId[],
): string {
  const named = items.map((id) => `"${String(id)}"`).join(', ')
  return `Renaming "${from}" to "${to}" makes the expression of ${named} too long.`
}
