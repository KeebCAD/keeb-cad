import { Err } from './err'
import type { Option } from './option'
import type { Result } from './result'
import type { Some } from './some'

export class None<T = unknown> {
  readonly kind = 'none' as const
  declare readonly _phantomT: T

  map<U>(_fn: (value: T) => U): Option<U> {
    return new None<U>()
  }

  flatMap<U>(_fn: (value: T) => Option<U>): Option<U> {
    return new None<U>()
  }

  filter(_predicate: (value: T) => boolean): Option<T> {
    return this
  }

  match<U>(handlers: { some: (value: T) => U; none: () => U }): U {
    return handlers.none()
  }

  getOr(fallback: T): T {
    return fallback
  }

  getOrUndefined(): T | undefined {
    return undefined
  }

  isSome(): this is Some<T> {
    return false
  }

  isNone(): this is None<T> {
    return true
  }

  okOr<E>(error: E): Result<T, E> {
    return new Err<T, E>(error)
  }

  okOrElse<E>(mkErr: () => E): Result<T, E> {
    return new Err<T, E>(mkErr())
  }
}
