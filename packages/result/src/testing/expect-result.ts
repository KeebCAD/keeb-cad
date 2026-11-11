import { expect } from 'vitest'

import type { Result } from '../result'

// An Err's iterator throws past its first yield, so the matchers can't compare a Result directly;
// both sides are compared as plain values instead.
export function expectResult<T, E>(actual: Result<T, E>, expected: Result<NoInfer<T>, NoInfer<E>>) {
  expect(plain(actual)).toEqual(plain(expected))
}

function plain<T, E>(result: Result<T, E>): { ok: T } | { err: E } {
  return result.match<{ ok: T } | { err: E }>({
    ok: (value) => ({ ok: value }),
    err: (error) => ({ err: error }),
  })
}
