import { Option } from '@keeb-cad/result'
import { compareId } from '@keeb-cad/schema'

// The worker sorts every output's ids by compareId, so a binary search finds an id's row.
export function findRow(ids: readonly string[], id: string): Option<number> {
  let low = 0
  let high = ids.length - 1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    const order = compareId(ids[middle] as string, id)
    if (order === 0) return Option.some(middle)
    if (order < 0) low = middle + 1
    else high = middle - 1
  }
  return Option.none()
}
