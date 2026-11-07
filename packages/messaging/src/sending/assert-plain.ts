import { NotPlainError } from './not-plain-error'

// Structured clone carries more than this (a Map, a Date, a class instance stripped of its
// methods), so a value it accepts can still arrive as something else.
export function assertPlain(value: unknown): void {
  walk(value, [], new Set())
}

function walk(value: unknown, path: readonly (string | number)[], seen: Set<object>): void {
  if (typeof value === 'symbol' || typeof value === 'function') throw notPlain(path)
  if (typeof value !== 'object' || value === null) return
  if (seen.has(value)) return
  seen.add(value)
  if (value instanceof ArrayBuffer) return
  if (ArrayBuffer.isView(value)) {
    if (value instanceof DataView || !(value.buffer instanceof ArrayBuffer)) throw notPlain(path)
    return
  }
  if (!Array.isArray(value)) {
    const prototype: unknown = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) throw notPlain(path)
  }
  // An array's own non-index properties cross too, so they are walked with its items.
  for (const [key, item] of Object.entries(value)) walk(item, [...path, key], seen)
}

function notPlain(path: readonly (string | number)[]): NotPlainError {
  return new NotPlainError(path.join('.'))
}
