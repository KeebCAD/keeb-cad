import { Result } from '@keeb-cad/result'

import type { LaneArgs, StageCalls } from '../lane/types'

export const noCalls: StageCalls = {
  operations: {},
  convertHandle: (_output, value) => Result.ok(value),
}

const emptyArgs: LaneArgs = { inputs: {}, pulls: {}, queries: {} }

export function noArgs(): LaneArgs {
  return emptyArgs
}

export function withInputs(inputs: Record<string, unknown>): () => LaneArgs {
  return () => ({ ...emptyArgs, inputs })
}

export function withPulls(pulls: Record<string, unknown>): LaneArgs {
  return { ...emptyArgs, pulls }
}

export function okValue(value: unknown) {
  return { ok: { outputs: { value }, problems: [] } }
}

export function laneFailed(failure: Record<string, unknown> & { cause: string }) {
  return { err: { kind: 'lane-failed', ...failure } }
}
