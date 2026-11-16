import type { BlueprintContract, LaneRef, PinnedBlueprint, PinnedScript } from '../pool/types'
import { aScript, STAGE } from './lane-script'

export function aPin(
  body: string,
  overrides: Partial<BlueprintContract> = {},
  closure: readonly PinnedScript[] = [],
): PinnedBlueprint {
  return { ...aScript(body, overrides), closure }
}

export function laneOf(pin: PinnedBlueprint): LaneRef {
  return { id: pin.declaration.id, version: pin.declaration.version, stage: STAGE }
}
