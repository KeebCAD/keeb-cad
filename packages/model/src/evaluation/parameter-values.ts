import type { Value } from '@keeb-cad/expr'
import type { Frozen, Parameter } from '@keeb-cad/schema'

import { evaluateParameters } from './evaluate-parameters'

// A parameter in a loop, one that fails, or one that reads either has no value, so it is absent.
export function parameterValues(parameters: Frozen<Parameter[]>): ReadonlyMap<string, Value> {
  return evaluateParameters(parameters).scope
}
