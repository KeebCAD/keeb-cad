import type { Unit } from '@keeb-cad/expr'
import * as v from 'valibot'

import { expressionSchema } from './expression'
import { quantityInputValueSchema } from './input-value'

const commonEntries = {
  label: v.string(),
  help: v.optional(v.string()),
  perSlot: v.optional(v.literal(true)),
}

const rangeSchema = v.strictObject({
  min: v.optional(expressionSchema),
  max: v.optional(expressionSchema),
})

const quantityInputSchema = v.strictObject({
  ...commonEntries,
  kind: v.literal('quantity'),
  unit: v.picklist(['mm', 'deg'] as const satisfies readonly Unit[]),
  range: v.optional(rangeSchema),
  default: quantityInputValueSchema,
})

const optionInputSchema = v.pipe(
  v.strictObject({
    ...commonEntries,
    kind: v.literal('option'),
    options: v.array(v.string()),
    default: v.string(),
  }),
  v.forward(
    v.check(({ options, default: value }) => options.includes(value), 'Not one of the options.'),
    ['default'],
  ),
)

const booleanInputSchema = v.strictObject({
  ...commonEntries,
  kind: v.literal('boolean'),
  default: v.boolean(),
})

const textInputSchema = v.strictObject({
  ...commonEntries,
  kind: v.literal('text'),
  default: v.string(),
})

export const declaredInputSchema = v.variant('kind', [
  quantityInputSchema,
  optionInputSchema,
  booleanInputSchema,
  textInputSchema,
])
