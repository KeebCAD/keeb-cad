import * as v from 'valibot'

import { parameterNameSchema } from '../parameter-name'
import type { ParameterName } from '../types'

export function aParameterName(text = 'wall'): ParameterName {
  return v.parse(parameterNameSchema, text)
}
