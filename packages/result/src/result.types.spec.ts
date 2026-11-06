import { describe, expectTypeOf, it } from 'vitest'

import type { Err } from './err'
import type { Ok } from './ok'
import { Result } from './result'
import type { ErrYield } from './types'

class TestError extends Error {
  readonly kind = 'test-error' as const
}

describe('Result', () => {
  describe('constructors', () => {
    it('Result.ok with no argument is typed Result<void, never>', () => {
      expectTypeOf(Result.ok()).toEqualTypeOf<Result<void, never>>()
    })

    it('Result.ok is typed Result<T, never>', () => {
      expectTypeOf(Result.ok(5)).toEqualTypeOf<Result<number, never>>()
    })

    it('Result.err is typed Result<never, E>', () => {
      expectTypeOf(Result.err(new TestError('x'))).toEqualTypeOf<Result<never, TestError>>()
    })
  })

  describe('type narrowing', () => {
    it('isOk narrows to Ok<T, E>', () => {
      const r: Result<number, TestError> = Result.ok(1)
      expectTypeOf([r].filter((x) => x.isOk())).toEqualTypeOf<Ok<number, TestError>[]>()
    })

    it('isErr narrows to Err<T, E>', () => {
      const r: Result<number, TestError> = Result.err(new TestError('x'))
      expectTypeOf([r].filter((x) => x.isErr())).toEqualTypeOf<Err<number, TestError>[]>()
    })
  })

  describe('flatMap', () => {
    it('widens the error union on chain', () => {
      class OtherError extends Error {
        readonly kind = 'other' as const
      }
      const r: Result<number, TestError> = Result.ok(1)
      const chained = r.flatMap((_n): Result<number, OtherError> => Result.err(new OtherError('o')))
      expectTypeOf(chained).toEqualTypeOf<Result<number, TestError | OtherError>>()
    })
  })

  describe('[Symbol.iterator]', () => {
    it('Err iterator yield type carries the error in a covariant slot', () => {
      const r: Result<number, TestError> = Result.err(new TestError('x'))
      const iter = r[Symbol.iterator]()
      expectTypeOf(iter.next())
        .extract<IteratorYieldResult<unknown>>()
        .toHaveProperty('value')
        .toEqualTypeOf<ErrYield<TestError>>()
    })
  })
})
