import { isPlainObject } from './is-plain-object'

// RFC 8785-style: keys sorted by UTF-16 code units, numbers in JSON's form, and an `undefined`
// property encoded as if absent, so `{ a: undefined }` and `{}` are the same value.
export function encodeCanonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`Cannot encode the number ${value}.`)
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item: unknown) => encodeCanonical(item)).join(',')}]`
  }
  if (typeof value === 'object' && isPlainObject(value)) {
    const record = value as Record<string, unknown>
    const members = Object.keys(record)
      .toSorted((a, b) => Number(a > b) - Number(a < b))
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${encodeCanonical(record[key])}`)
    return `{${members.join(',')}}`
  }
  throw new TypeError(`Cannot encode a non-plain value (${typeof value}).`)
}
