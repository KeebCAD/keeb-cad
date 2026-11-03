import { None } from './none'
import { Ok } from './ok'
import type { Option } from './option'
import type { Result } from './result'

export class Some<T> {
  readonly kind = 'some' as const
  constructor(readonly value: T) {}

  map<U>(fn: (value: T) => U): Option<U> {
    return new Some<U>(fn(this.value))
  }

  flatMap<U>(fn: (value: T) => Option<U>): Option<U> {
    return fn(this.value)
  }

  filter(predicate: (value: T) => boolean): Option<T> {
    return predicate(this.value) ? this : new None<T>()
  }

  match<U>(handlers: { some: (value: T) => U; none: () => U }): U {
    return handlers.some(this.value)
  }

  getOr(_fallback: T): T {
    return this.value
  }

  getOrUndefined(): T | undefined {
    return this.value
  }

  isSome(): this is Some<T> {
    return true
  }

  isNone(): this is None<T> {
    return false
  }

  okOr<E>(_error: E): Result<T, E> {
    return new Ok<T, E>(this.value)
  }

  okOrElse<E>(_mkErr: () => E): Result<T, E> {
    return new Ok<T, E>(this.value)
  }
}
