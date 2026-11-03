import { expect } from 'vitest'

import { findUnfrozen } from './find-unfrozen'

export function expectDeeplyFrozen(value: unknown): void {
  expect(findUnfrozen(value)).toEqual([])
}
