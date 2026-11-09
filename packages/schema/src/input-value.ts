import * as v from 'valibot'

import { expressionSchema } from './expression'

export const quantityInputValueSchema = v.strictObject({
  type: v.literal('quantity'),
  value: expressionSchema,
})

export const inputValueSchema = v.union([v.boolean(), v.string(), quantityInputValueSchema])
