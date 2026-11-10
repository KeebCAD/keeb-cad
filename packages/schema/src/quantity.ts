import { parseExpression } from '@keeb-cad/expr'
import * as v from 'valibot'

import { expressionSchema } from './expression'
import type { Quantity, Unit } from './types'

export function quantity<U extends Unit>(unit: U): v.GenericSchema<string, Quantity<U>> {
  // The one cast: the unit is a phantom the inferred Expression can't carry.
  return v.pipe(
    expressionSchema,
    v.check(
      (text) =>
        parseExpression(text).match({ ok: (literal) => literal.unit === unit, err: () => true }),
      `Not a quantity in ${unit}.`,
    ),
    v.metadata({ unit }),
  ) as v.GenericSchema<string, Quantity<U>>
}
