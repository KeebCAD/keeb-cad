import type { PackedLayoutOutput } from '../layout-output/types'
import type { PackedPartsOutput } from '../parts-output/types'

export function buffersOf(packed: PackedPartsOutput | PackedLayoutOutput): ArrayBuffer[] {
  return Object.values(packed).flatMap((column) => (Array.isArray(column) ? [] : [column.buffer]))
}
