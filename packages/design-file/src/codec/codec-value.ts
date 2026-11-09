import { InvariantError } from '@keeb-cad/result'

export function codecValue(value: unknown): string | number | boolean {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    throw new InvariantError(
      `The KDL codec writes only strings, numbers and booleans, not ${typeof value}.`,
    )
  }
  return value
}
