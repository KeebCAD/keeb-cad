import type { StageCalls } from '@keeb-cad/blueprint'
import { Result } from '@keeb-cad/result'
import type { BlueprintDeclaration } from '@keeb-cad/schema'

import { isSlotSpace } from './is-slot-space'

export function slotSpaceOutputOf(declaration: BlueprintDeclaration): string | undefined {
  return declaration.lanes.parts?.outputs.find(({ role }) => role === 'slot-space')?.name
}

export function partsLaneCalls(declaration: BlueprintDeclaration): StageCalls {
  const slotSpace = slotSpaceOutputOf(declaration)
  return {
    operations: {},
    convertHandle: (output, value) => {
      if (output !== slotSpace) return Result.ok(value)
      return isSlotSpace(value)
        ? Result.ok(value)
        : Result.err(`The slot space is not well-formed polygon regions.`)
    },
  }
}
