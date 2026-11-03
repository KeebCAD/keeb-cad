import type { Frozen } from '@keeb-cad/schema'
import { freeze } from 'immer'

export function deepFreeze<T>(value: T): Frozen<T> {
  return freeze(value, true) as Frozen<T>
}
