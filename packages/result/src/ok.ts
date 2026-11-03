import type { Err } from './err'
import type { Result } from './result'

export class Ok<T, E> {
  readonly kind = 'ok' as const
  declare readonly _phantomE: E

  constructor(readonly value: T) {}

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok<U, E>(fn(this.value))
  }

  mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return new Ok<T, F>(this.value)
  }

  tap(fn: (value: T) => void): Result<T, E> {
    fn(this.value)
    return this
  }

  tapErr(_fn: (error: E) => void): Result<T, E> {
    return this
  }

  flatMap<U, F>(fn: (value: T) => Result<U, F>): Result<U, E | F> {
    return fn(this.value)
  }

  match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U {
    return handlers.ok(this.value)
  }

  isOk(): this is Ok<T, E> {
    return true
  }

  isErr(): this is Err<T, E> {
    return false
  }

  [Symbol.iterator](): Iterator<never, T> {
    let consumed = false
    return {
      next: () => {
        if (consumed) {
          return { done: true, value: undefined as never }
        }
        consumed = true
        return { done: true, value: this.value }
      },
    }
  }
}
