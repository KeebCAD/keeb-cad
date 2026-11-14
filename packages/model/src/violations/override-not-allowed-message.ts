import type { ItemId } from '@keeb-cad/schema'

export function overrideNotAllowedMessage(ids: readonly ItemId[]): string {
  const [target] = ids
  return `The override on "${String(target)}" swaps its part, which a reversible board doesn't allow; an override there can only remove the part.`
}
