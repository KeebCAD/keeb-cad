import type { BlueprintSource, DeclaredInputSource } from './types'

export function defineBlueprint<const Inputs extends Readonly<Record<string, DeclaredInputSource>>>(
  blueprint: BlueprintSource<Inputs>,
): BlueprintSource<Inputs> {
  return blueprint
}
