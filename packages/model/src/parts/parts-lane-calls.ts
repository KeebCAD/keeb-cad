import type { StageCalls } from '@keeb-cad/blueprint'
import { Result } from '@keeb-cad/result'
import type { BlueprintDeclaration } from '@keeb-cad/schema'

export function rectangleOutputOf(declaration: BlueprintDeclaration): string | undefined {
  return declaration.lanes.parts?.outputs.find(({ role }) => role === 'rectangle')?.name
}

export function partsLaneCalls(declaration: BlueprintDeclaration): StageCalls {
  const rectangle = rectangleOutputOf(declaration)
  return {
    operations: {},
    convertHandle: (output, value) => {
      if (output !== rectangle) return Result.ok(value)
      const { w, h } = (typeof value === 'object' && value !== null ? value : {}) as {
        w?: unknown
        h?: unknown
      }
      return isPositive(w) && isPositive(h)
        ? Result.ok({ w, h })
        : Result.err(`The rectangle needs w and h above 0.`)
    },
  }
}

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}
