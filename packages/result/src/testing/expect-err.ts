import { expect } from 'vitest'

import type { Err } from '../err'
import type { Result } from '../result'

export function expectErr<T, E>(result: Result<T, E>): asserts result is Err<T, E> {
  expect(result.kind, `Expected Err, got Ok: ${String(result.isOk() && result.value)}`).toBe('err')
}
