import { InvariantError } from './invariant-error'
import type { Ok } from './ok'
import type { Result } from './result'
import type { ErrYield } from './types'

export class Err<T, E> {
  readonly kind = 'err' as const
  declare readonly _phantomT: T

  constructor(readonly error: E) {}

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return new Err<U, E>(this.error)
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return new Err<T, F>(fn(this.error))
  }

  tap(_fn: (value: T) => void): Result<T, E> {
    return this
  }

  tapErr(fn: (error: E) => void): Result<T, E> {
    fn(this.error)
    return this
  }

  flatMap<U, F>(_fn: (value: T) => Result<U, F>): Result<U, E | F> {
    return new Err<U, E | F>(this.error)
  }

  match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U {
    return handlers.err(this.error)
  }

  isOk(): this is Ok<T, E> {
    return false
  }

  isErr(): this is Err<T, E> {
    return true
  }

  *[Symbol.iterator](): Generator<ErrYield<E>, never, unknown> {
    yield this
    throw new InvariantError('Err iterator consumed past the short-circuit yield')
  }
}
