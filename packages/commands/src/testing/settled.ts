import type { Result } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

// A Result iterates, and Vitest's equality throws iterating an Err, so tests compare this instead.
export function settled(result: Result<void, Rejection>): Rejection | 'ok' {
  return result.match<Rejection | 'ok'>({ ok: () => 'ok', err: (rejection) => rejection })
}
