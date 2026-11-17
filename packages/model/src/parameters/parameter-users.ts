import type { Design, Frozen, ItemId, ParameterName } from '@keeb-cad/schema'

import { walkReferences } from '../references/walk-references'
import { expressionOwners } from './expression-owners'

// Every item whose expressions use the name, each once in design order. A parameter's own value
// is not a use, so a parameter in a loop of one names no user.
// Only the first parameter with the name is its own: a later one with that name reads the first.
export function parameterUsers(design: Frozen<Design>, name: ParameterName): ItemId[] {
  const own = design.parameters.findIndex((parameter) => parameter.name === name)
  const paths = [...walkReferences(design)]
    .filter(({ kind, target }) => kind === 'parameter' && target === name)
    .map(({ path }) => path)
    .filter(([section, index]) => !(section === 'parameters' && index === own))
  return expressionOwners(design, paths)
}
