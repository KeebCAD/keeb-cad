import { Result } from '@keeb-cad/result'

import type { StageCalls } from '../lane/types'
import type { BlueprintContract, LaneRef, PinnedBlueprint, PinnedScript } from '../pool/types'

export const STAGE = 'parts'

export function aContract(overrides: Partial<BlueprintContract> = {}): BlueprintContract {
  return {
    id: 'lib:blueprint/test',
    version: 1,
    apiVersion: 1,
    inputs: {},
    uses: [],
    lanes: { [STAGE]: { outputs: [{ name: 'value', count: 'one' }] } },
    ...overrides,
  }
}

/** A script from the body of its one lane, a function of `(args, op)`. */
export function laneScript(body: string): string {
  return `({ lanes: { ${STAGE}(args, op) { ${body} } } })`
}

export function aScript(body: string, overrides: Partial<BlueprintContract> = {}): PinnedScript {
  return { declaration: aContract(overrides), script: laneScript(body) }
}

export function aPin(
  body: string,
  overrides: Partial<BlueprintContract> = {},
  closure: readonly PinnedScript[] = [],
): PinnedBlueprint {
  return { ...aScript(body, overrides), closure }
}

export const laneOf = (pin: PinnedBlueprint): LaneRef => ({
  id: pin.declaration.id,
  version: pin.declaration.version,
  stage: STAGE,
})

export const noCalls: StageCalls = {
  operations: {},
  convertHandle: (_output, value) => Result.ok(value),
}

const emptyArgs = { inputs: {}, pulls: {}, queries: {} }

export const noArgs = () => emptyArgs

export const withInputs = (inputs: Record<string, unknown>) => () => ({ ...emptyArgs, inputs })

export const withPulls = (pulls: Record<string, unknown>) => ({ ...emptyArgs, pulls })

export const okValue = (value: unknown) => ({ ok: { outputs: { value }, problems: [] } })

export const laneFailed = (failure: Record<string, unknown> & { cause: string }) => ({
  err: { kind: 'lane-failed', ...failure },
})

export const returning = (expression: string) =>
  `return { outputs: { value: ${expression} }, problems: [] }`

export const MIB = 1024 * 1024
