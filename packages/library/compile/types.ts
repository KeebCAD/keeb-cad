import type { BlueprintDeclaration } from '@keeb-cad/schema'

export interface CompiledBlueprint {
  declaration: BlueprintDeclaration
  script: string
  visibleUses: string[]
}

export type LibraryRuleEntry = Pick<CompiledBlueprint, 'declaration' | 'visibleUses'>

export interface CompileLibraryOptions {
  sourcesDir: string
  outDir: string
}
