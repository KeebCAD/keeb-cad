import type { Err } from '../err'
import type { Result } from '../result'

export function expectErr<T, E>(result: Result<T, E>): asserts result is Err<T, E> {
  if (result.kind !== 'err') {
    throw new Error(`Expected Err, got Ok: ${String(result.value)}`)
  }
}
