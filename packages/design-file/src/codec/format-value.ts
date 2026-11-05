import { format, Value } from '@bgotink/kdl'
import { InvariantError } from '@keeb-cad/result'

// The KDL library escapes; a string it would leave bare, as an identifier, is quoted all the same.
export function formatValue(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new InvariantError(`The KDL codec writes only strings and numbers, not ${typeof value}.`)
  }
  const text = format(new Value(value))
  return text === value ? `"${text}"` : text
}
