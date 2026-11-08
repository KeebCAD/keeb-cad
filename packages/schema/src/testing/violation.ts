import type { Violation } from '../types'

export function aViolation(overrides: Partial<Violation> = {}): Violation {
  return {
    kind: 'lane-failed',
    severity: 'warning',
    ids: [],
    message: 'a violation',
    fixes: [],
    ...overrides,
  }
}
