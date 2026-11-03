import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'
import { match, P } from 'ts-pattern'

/**
 * The content hash of a plain value: SHA-256, as lowercase hex, of its canonical encoding (AD-10).
 * Synchronous. Callers parse the result with their own schema (`Revision`, `Hash`). Provisional
 * until the mirror-hash spike, which may change its function and its values behind this call.
 */
export function hash(value: unknown): string {
  return bytesToHex(sha256(utf8ToBytes(encode(value))))
}

/**
 * JSON with object keys sorted (UTF-16 code-unit order) and `undefined` fields skipped, so two
 * values that are equal as data encode the same whatever their key order. Finite numbers are
 * written as JSON writes them; `NaN`, `Infinity` and `-Infinity` as those bare tokens, which no
 * JSON value can collide with. Anything that is not plain data (a Map, a Date, a class instance,
 * a function) is a bug and throws.
 */
function encode(value: unknown): string {
  return match(value)
    .with(null, () => 'null')
    .with(P.string, P.boolean, (primitive) => JSON.stringify(primitive))
    .with(P.number, (number) => (Number.isFinite(number) ? JSON.stringify(number) : String(number)))
    .when(Array.isArray, (items: readonly unknown[]) => {
      return `[${items.map((item) => (item === undefined ? 'null' : encode(item))).join(',')}]`
    })
    .when(isPlainObject, (object) => {
      const entries = Object.entries(object)
        .filter(([, field]) => field !== undefined)
        .toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      return `{${entries.map(([key, field]) => `${JSON.stringify(key)}:${encode(field)}`).join(',')}}`
    })
    .otherwise((other) => {
      throw new TypeError(`hash: cannot encode ${describe(other)}`)
    })
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function describe(value: unknown): string {
  return typeof value === 'object' && value !== null
    ? `an instance of ${value.constructor?.name ?? 'an unknown class'}`
    : `a ${typeof value}`
}
