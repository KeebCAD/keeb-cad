import type { ItemId } from '@keeb-cad/schema'

// The first id again at the end shows the loop close, even for a node that depends on itself.
export function dependencyCycleMessage(ids: readonly ItemId[]): string {
  const loop = [...ids, ...ids.slice(0, 1)].map((id) => `"${id}"`).join(' → ')
  return `The nodes form a loop: ${loop}.`
}
