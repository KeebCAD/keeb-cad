import type { ItemId } from '@keeb-cad/schema'

// The first id again at the end shows the loop close, even for an item that depends on itself.
export function dependencyCycleMessage(
  ids: readonly ItemId[],
  members: 'nodes' | 'parameters',
): string {
  const loop = [...ids, ...ids.slice(0, 1)].map((id) => `"${id}"`).join(' → ')
  return `The ${members} form a loop: ${loop}.`
}
