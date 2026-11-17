import type { Frozen, Parameter, ParameterName } from '@keeb-cad/schema'

import { expressionNames } from '../references/expression-names'
import type { Dependencies } from './types'

// Each parameter with the names its value reads, in reading order without repeats. Of two
// parameters with one name, expressions read the first, so a later one adds no edges.
export function parameterDependencies(
  parameters: Frozen<Parameter[]>,
): Dependencies<ParameterName> {
  const dependencies = new Map<ParameterName, ParameterName[]>()
  for (const { name, value } of parameters) {
    if (dependencies.has(name)) continue
    dependencies.set(name, [...new Set(expressionNames(value))] as ParameterName[])
  }
  return dependencies
}
