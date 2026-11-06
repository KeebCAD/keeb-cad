import { describe, expectTypeOf, it } from 'vitest'

import { AsyncResult } from './async-result'
import { attempt } from './attempt'
import { Result } from './result'

class ErrA extends Error {
  readonly kind = 'err-a' as const
}
class ErrB extends Error {
  readonly kind = 'err-b' as const
}

describe('attempt (sync)', () => {
  it('widens the error channel as multiple error types are yielded', () => {
    const r = attempt(function* () {
      const a = yield* Result.ok(2) as Result<number, ErrA>
      const b = yield* Result.ok(3) as Result<number, ErrB>
      return a + b
    })
    expectTypeOf(r).toEqualTypeOf<Result<number, ErrA | ErrB>>()
  })
})

describe('attempt (async)', () => {
  it('returns an AsyncResult (thenable) from the async overload', () => {
    const ar = attempt(async function* () {
      yield* AsyncResult.ok(undefined)
      return 0
    })
    expectTypeOf(ar).toEqualTypeOf<AsyncResult<number, never>>()
  })
})
