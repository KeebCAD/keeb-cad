import type { ItemId } from '@keeb-cad/schema'

export function unsupportedFormMessage(ids: readonly ItemId[]): string {
  const [design] = ids
  return `The design "${String(design)}" can't be placed: this version builds only a split design with a reversible board.`
}
