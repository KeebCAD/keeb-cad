import type { Id } from '@keeb-cad/schema'

export function viewportStorageKey(designId: Id): string {
  return `keeb-cad.viewport.${designId}`
}
