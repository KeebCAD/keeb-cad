import { expect } from 'vitest'

import type { Ok } from '../ok'
import type { Result } from '../result'

export function expectOk<T, E>(result: Result<T, E>): asserts result is Ok<T, E> {
  expect(result.kind, `Expected Ok, got Err: ${String(result.isErr() && result.error)}`).toBe('ok')
}
