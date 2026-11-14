import * as v from 'valibot'

import { idSchema } from './id'

const SIDES = ['left/', 'right/']

export const sideIdSchema = v.pipe(
  v.string(),
  v.custom<`${'left' | 'right'}/${string}`>(
    (input) =>
      typeof input === 'string' &&
      SIDES.some((side) => input.startsWith(side) && v.is(idSchema, input.slice(side.length))),
    'Not a side id.',
  ),
  v.brand('SideId'),
)
