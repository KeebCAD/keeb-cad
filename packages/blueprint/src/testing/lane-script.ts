import type { BlueprintContract, PinnedScript } from '../pool/types'
import { aContract } from './a-contract'

export const STAGE = 'parts'

/** A script from the body of its one lane, a function of `(args, op)`. */
export function laneScript(body: string): string {
  return `({ lanes: { ${STAGE}(args, op) { ${body} } } })`
}

export function aScript(body: string, overrides: Partial<BlueprintContract> = {}): PinnedScript {
  return { declaration: aContract(overrides), script: laneScript(body) }
}

export function returning(expression: string): string {
  return `return { outputs: { value: ${expression} }, problems: [] }`
}
