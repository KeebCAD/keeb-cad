import { Option } from '@keeb-cad/result'
import { compareCodeUnits } from '@keeb-cad/schema'

import { anchorCycle } from './anchor-cycle'
import type { Dependencies } from './types'

// Only a loop through an edge `is` added over `was` counts, found from the changed items in
// compareCodeUnits order and listed from the changed item.
export function addedLoop(was: Dependencies<string>, is: Dependencies<string>): Option<string[]> {
  for (const item of [...is.keys()].toSorted(compareCodeUnits)) {
    const had = new Set(was.get(item))
    for (const target of is.get(item) ?? []) {
      if (had.has(target)) continue
      const loop = anchorCycle(is, item, target)
      if (loop.isSome()) return loop
    }
  }
  return Option.none()
}
