import { expect } from 'vitest'

import { findFrozen } from './find-frozen'

export function expectNothingFrozen(value: unknown): void {
  expect(findFrozen(value)).toEqual([])
}
