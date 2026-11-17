import type { Dependencies } from './types'

// The seeds and every item that depends on one, however indirectly.
export function unplacedOf<T extends string>(
  dependencies: Dependencies<T>,
  seeds: Iterable<T>,
): ReadonlySet<T> {
  const unplaced = new Map<T, boolean>()
  for (const seed of seeds) unplaced.set(seed, true)
  const visit = (item: T): boolean => {
    const known = unplaced.get(item)
    if (known !== undefined) return known
    // Callers seed every loop, so an item met again while it is open is not the reason.
    unplaced.set(item, false)
    const isUnplaced = (dependencies.get(item) ?? []).some((next) => visit(next))
    unplaced.set(item, isUnplaced)
    return isUnplaced
  }
  for (const item of dependencies.keys()) visit(item)
  return new Set([...unplaced].filter(([, isUnplaced]) => isUnplaced).map(([item]) => item))
}
