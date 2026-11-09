import type { ItemId, ModelRejectionKind, Rejection } from '@keeb-cad/schema'

export function reject(kind: ModelRejectionKind, ids: ItemId[], message: string): Rejection {
  return { kind, ids, message }
}
