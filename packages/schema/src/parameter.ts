import * as v from 'valibot'

import { expressionSchema } from './expression'
import { parameterNameSchema } from './parameter-name'

export const parameterSchema = v.pipe(
  v.strictObject({ name: parameterNameSchema, value: expressionSchema }),
  v.metadata({ node: 'parameter' }),
)
