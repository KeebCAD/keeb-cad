import type { Frozen, Override } from '@keeb-cad/schema'

// At most one override per key: its type and target, plus the component it removes.
export function overrideKey(override: Frozen<Override>): string {
  return override.type === 'side-component'
    ? `${override.type} ${override.target} ${override.component}`
    : `${override.type} ${override.target}`
}
