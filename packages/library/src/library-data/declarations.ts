import type { BlueprintDeclaration } from '@keeb-cad/schema'

import { groupDeclarations } from './group-declarations'

const compiled = import.meta.glob<BlueprintDeclaration>('../../compiled/**/*.json', {
  eager: true,
  import: 'default',
})

export const declarations = groupDeclarations(Object.values(compiled))
