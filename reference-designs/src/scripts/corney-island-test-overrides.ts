import type { LayoutScript } from './types'

// Test-only: the real Corney Island sets no overrides, and corneyIslandLayout never includes this
// step. It removes one right thumb key's part so tests can see a removed slot keep its space.
export const corneyIslandTestOverrides: LayoutScript = [
  {
    command: 'overrides.setOverride',
    input: { type: 'side-part', target: 'right/thumbfan-far-home', part: null },
  },
]
