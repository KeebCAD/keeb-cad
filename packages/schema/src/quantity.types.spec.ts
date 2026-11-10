import type * as v from 'valibot'
import { describe, expectTypeOf, it } from 'vitest'

import type { lengthSchema } from './length'
import type { Angle, Length, Quantity } from './types'

describe('a quantity field', () => {
  it('infers a quantity in its unit from lengthSchema', () => {
    expectTypeOf<v.InferOutput<typeof lengthSchema>>().toEqualTypeOf<Quantity<'mm'>>()
  })

  it('refuses an angle where a length goes', () => {
    expectTypeOf<Angle>().not.toExtend<Length>()
  })
})
