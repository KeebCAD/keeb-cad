import type { LaneDeclaration } from '../types'

export function aLaneDeclaration(overrides: Partial<LaneDeclaration> = {}): LaneDeclaration {
  return {
    pulls: [],
    queries: [],
    outputs: [{ name: 'rectangle', role: 'rectangle', kind: 'shape', count: 'one' }],
    ...overrides,
  }
}
