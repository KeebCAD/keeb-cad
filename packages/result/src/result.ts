import { Err } from './err'
import { Ok } from './ok'
import type { Option } from './option'

export type Result<T, E> = Ok<T, E> | Err<T, E>

// Overloads rather than an optional parameter, so `Result.ok<number>()` does not type-check.
function ok(): Result<void, never>
function ok<T>(value: T): Result<T, never>
function ok<T>(value?: T): Result<T | void, never> {
  return new Ok<T | void, never>(value)
}

export const Result = {
  ok,
  err<E>(error: E): Result<never, E> {
    return new Err<never, E>(error)
  },
  fromThrowing<T, E>(fn: () => T, mapErr: (cause: unknown) => E): Result<T, E> {
    try {
      return new Ok<T, E>(fn())
    } catch (error) {
      return new Err<T, E>(mapErr(error))
    }
  },
  fromOption<T, E>(option: Option<T>, mkErr: () => E): Result<T, E> {
    return option.isSome() ? new Ok<T, E>(option.value) : new Err<T, E>(mkErr())
  },
}
