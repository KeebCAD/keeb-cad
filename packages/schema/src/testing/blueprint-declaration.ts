import type { BlueprintDeclaration } from '../types'
import { aBlueprintId } from './blueprint-id'
import { aLaneDeclaration } from './lane-declaration'
import { aVersion } from './version'

export function aBlueprintDeclaration(
  overrides: Partial<BlueprintDeclaration> = {},
): BlueprintDeclaration {
  return {
    id: aBlueprintId(),
    version: aVersion(),
    apiVersion: 1,
    licence: { spdx: 'MIT', author: 'keeb-cad' },
    inputs: {},
    lanes: { parts: aLaneDeclaration() },
    uses: [],
    ...overrides,
  }
}
