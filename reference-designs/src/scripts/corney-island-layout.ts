import type { LayoutScript } from './types'

// Corney Island's outer column, from source/config.yaml's matrix columns; the chain steps up the
// positive y axis, so the bottom row comes first.
export const corneyIslandLayout: LayoutScript = [
  { command: 'layout.addGroup', input: { id: 'outer', arrangement: 'chain', axis: 'y' } },
  { command: 'layout.addSlot', input: { parent: 'outer', id: 'outer-bottom' } },
  { command: 'layout.addSlot', input: { parent: 'outer', id: 'outer-home' } },
  { command: 'layout.addSlot', input: { parent: 'outer', id: 'outer-top' } },
]
