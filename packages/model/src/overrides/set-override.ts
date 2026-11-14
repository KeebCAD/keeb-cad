import type { Design, Mutable, Override, Rejection } from '@keeb-cad/schema'

import { checkSetOverride } from './check-set-override'
import { overrideKey } from './override-key'

// A repeated key replaces its override where it stands, so the list keeps its order; a new one is
// appended.
export function setOverride(design: Mutable<Design>, override: Override): void | Rejection {
  const checked = checkSetOverride(design, override)
  if (checked.isErr()) return checked.error
  const key = overrideKey(override)
  const index = design.overrides.findIndex((existing) => overrideKey(existing) === key)
  if (index === -1) {
    design.overrides.push(override)
  } else {
    design.overrides[index] = override
  }
}
