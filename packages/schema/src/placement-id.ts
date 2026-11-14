import * as v from 'valibot'

import { idSchema } from './id'

const SIDES = ['left/', 'right/', 'whole/']

export const placementIdSchema = v.pipe(
  v.string(),
  v.custom<`${'left' | 'right' | 'whole'}/${string}`>(
    (input) =>
      typeof input === 'string' &&
      SIDES.some((side) => input.startsWith(side) && v.is(idSchema, input.slice(side.length))),
    'Not a placement id.',
  ),
  v.brand('PlacementId'),
)
