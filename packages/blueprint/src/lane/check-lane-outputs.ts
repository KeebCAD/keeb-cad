import { Result } from '@keeb-cad/result'
import * as v from 'valibot'

import { laneValueSchema } from './lane-result-schema'
import type { LaneOutput, LaneContract, LaneFailed } from './types'

const roleFailure = (output: string): LaneFailed => ({ kind: 'lane-failed', cause: 'role', output })

export function checkLaneOutputs(
  contract: LaneContract,
  value: unknown,
): Result<LaneOutput, LaneFailed> {
  const parsed = v.safeParse(laneValueSchema, value)
  if (!parsed.success) {
    return Result.err(roleFailure(v.getDotPath(parsed.issues[0]) ?? 'outputs'))
  }
  const { outputs, problems } = parsed.output

  const declared = new Map(contract.outputs.map((output) => [output.name, output]))
  for (const name of Object.keys(outputs)) {
    if (!declared.has(name)) return Result.err(roleFailure(name))
  }

  const checked: Record<string, unknown> = {}
  for (const { name, count } of contract.outputs) {
    if (!Object.hasOwn(outputs, name)) return Result.err(roleFailure(name))
    const output = outputs[name]
    if (Array.isArray(output) === (count === 'one')) return Result.err(roleFailure(name))
    checked[name] = output
  }
  return Result.ok({ outputs: checked, problems })
}
