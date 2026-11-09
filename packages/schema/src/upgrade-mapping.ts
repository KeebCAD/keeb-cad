import * as v from 'valibot'

import { expressionSchema } from './expression'
import { inputValueSchema } from './input-value'
import { versionSchema } from './version'

export const upgradeMappingSchema = v.strictObject({
  from: versionSchema,
  renames: v.optional(v.record(v.string(), v.string())),
  defaults: v.optional(v.record(v.string(), inputValueSchema)),
  convert: v.optional(v.record(v.string(), expressionSchema)),
})
