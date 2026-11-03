import { None } from './none'
import { Some } from './some'

export type Option<T> = Some<T> | None<T>

export const Option = {
  some<T>(value: T): Option<T> {
    return new Some<T>(value)
  },
  none<T = never>(): Option<T> {
    return new None<T>()
  },
  fromNullable<T>(value: T | null | undefined): Option<T> {
    return value === null || value === undefined ? new None<T>() : new Some<T>(value)
  },
}
