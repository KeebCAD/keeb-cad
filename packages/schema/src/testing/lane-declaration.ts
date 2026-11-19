import type { LaneDeclaration } from '../types'

export function aLaneDeclaration(overrides: Partial<LaneDeclaration> = {}): LaneDeclaration {
  return {
    pulls: [],
    queries: [],
    outputs: [{ name: 'slot-space', role: 'slot-space', kind: 'shape', count: 'one' }],
    ...overrides,
  }
}
