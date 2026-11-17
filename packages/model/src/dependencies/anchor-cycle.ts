import { Option } from '@keeb-cad/result'

import type { Dependencies } from './types'

// The loop that making `item` depend on `target` would close, in order from `item`.
export function anchorCycle<T extends string>(
  dependencies: Dependencies<T>,
  item: T,
  target: T,
): Option<T[]> {
  const cycle: T[] = [item]
  const seen = new Set<T>()
  const reaches = (current: T): boolean => {
    if (current === item) return true
    // A loop that doesn't pass through `item` is not closed by this edge.
    if (seen.has(current) || !dependencies.has(current)) return false
    seen.add(current)
    cycle.push(current)
    if ((dependencies.get(current) ?? []).some((next) => reaches(next))) return true
    cycle.pop()
    return false
  }
  return reaches(target) ? Option.some(cycle) : Option.none()
}
