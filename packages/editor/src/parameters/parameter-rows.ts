import { type Frozen, type Parameter, parameterSchema } from '@keeb-cad/schema'

import { evaluatedSuffix } from '../expression-field/evaluated-suffix'
import type { ParameterRowProps } from './types'

// One row per parameter, in the design's order; a later parameter repeating a taken name is
// read-only.
export function parameterRows(parameters: Frozen<Parameter[]>): ParameterRowProps[] {
  const names = new Set<string>()
  return parameters.map((parameter) => {
    if (!names.has(parameter.name)) {
      names.add(parameter.name)
      return { parameter }
    }
    const suffix = evaluatedSuffix(parameters, parameter.value, parameterSchema.entries.value)
    const shown = suffix === undefined ? parameter.value : `${parameter.value} ${suffix}`
    return { parameter, readOnlyText: `${parameter.name} = ${shown}` }
  })
}
