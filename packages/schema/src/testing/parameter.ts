import * as v from 'valibot'

import { parameterSchema } from '../parameter'
import type { Parameter } from '../types'
import { anExpression } from './expression'
import { aParameterName } from './parameter-name'

export function aParameter({
  name = aParameterName(),
  value = anExpression('1mm'),
}: Partial<Parameter> = {}): Parameter {
  return v.parse(parameterSchema, { name, value })
}
