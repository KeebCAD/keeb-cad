import type { BlueprintInputInvalid } from '../inputs/types'

// Each owner's fault on its input lowest by compareCodeUnits; the list is in that order per owner.
export function firstPerOwner(faults: readonly BlueprintInputInvalid[]): BlueprintInputInvalid[] {
  const seen = new Set<string>()
  return faults.filter(({ owner }) => {
    const key = `${owner.scope} ${owner.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
