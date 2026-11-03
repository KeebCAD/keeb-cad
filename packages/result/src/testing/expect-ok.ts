import type { Ok } from '../ok'
import type { Result } from '../result'

export function expectOk<T, E>(result: Result<T, E>): asserts result is Ok<T, E> {
  if (result.kind !== 'ok') {
    throw new Error(`Expected Ok, got Err: ${String(result.error)}`)
  }
}
