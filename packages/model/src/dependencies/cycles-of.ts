import { compareCodeUnits } from '@keeb-cad/schema'

import type { Dependencies } from './types'

// Each loop once, in loop order from its lowest member by compareCodeUnits, sorted by that member.
// A dependency on an item the map lacks leads nowhere.
export function cyclesOf<T extends string>(dependencies: Dependencies<T>): T[][] {
  const done = new Set<T>()
  const found = new Map<string, T[]>()
  const path: T[] = []
  const visit = (item: T) => {
    if (done.has(item)) return
    const at = path.indexOf(item)
    if (at !== -1) {
      const cycle = fromLowest(path.slice(at))
      found.set(cycle.join(' '), cycle)
      return
    }
    path.push(item)
    for (const next of dependencies.get(item) ?? []) if (dependencies.has(next)) visit(next)
    path.pop()
    done.add(item)
  }
  for (const start of dependencies.keys()) visit(start)
  return [...found.values()].toSorted(([a], [b]) => compareCodeUnits(a as T, b as T))
}

function fromLowest<T extends string>(cycle: T[]): T[] {
  const lowest = cycle.toSorted(compareCodeUnits)[0] as T
  const at = cycle.indexOf(lowest)
  return [...cycle.slice(at), ...cycle.slice(0, at)]
}
