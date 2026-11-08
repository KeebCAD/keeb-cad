import { Result } from '@keeb-cad/result'
import * as v from 'valibot'

import { laneResultSchema } from './lane-result-schema'
import type { LaneFailed } from './types'

const UNREADABLE: LaneFailed = {
  kind: 'lane-failed',
  cause: 'boundary',
  message: 'the boundary returned an unreadable result',
}

export function decodeLaneResult(text: string): Result<unknown, LaneFailed> {
  return Result.fromThrowing(
    () => JSON.parse(text) as unknown,
    () => UNREADABLE,
  ).flatMap((parsed) => {
    const decoded = v.safeParse(laneResultSchema, parsed)
    if (!decoded.success) return Result.err(UNREADABLE)
    const result = decoded.output
    if ('ok' in result) return Result.ok(result.ok)
    if ('failed' in result) {
      return Result.err({ kind: 'lane-failed', cause: 'threw', message: result.failed })
    }
    if ('notJsonExact' in result) {
      return Result.err({
        kind: 'lane-failed',
        cause: 'not-json-exact',
        path: result.notJsonExact.path,
      })
    }
    return Result.err({ kind: 'lane-failed', cause: 'out-of-memory' })
  })
}
