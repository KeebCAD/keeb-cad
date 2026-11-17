import type { ItemId } from '@keeb-cad/schema'

export function parameterInUseMessage(name: string, users: readonly ItemId[]): string {
  const named = users.map((id) => `"${String(id)}"`).join(', ')
  return `The parameter "${name}" is used by ${named}.`
}
