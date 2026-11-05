import { InvariantError } from '@keeb-cad/result'

export function codecValue(value: unknown): string | number {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new InvariantError(`The KDL codec writes only strings and numbers, not ${typeof value}.`)
  }
  return value
}
