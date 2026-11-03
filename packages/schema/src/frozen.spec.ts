import { describe, expectTypeOf, it } from 'vitest'

import type { Design, Frozen, Mutable } from './types'

describe('Frozen', () => {
  it('refuses a nested write', () => {
    const rename = (design: Frozen<Design>) => {
      // @ts-expect-error A frozen design is read-only all the way down.
      design.meta.form.type = 'unibody'
    }
    expectTypeOf(rename).toBeFunction()
  })

  it('keeps a branded id branded', () => {
    expectTypeOf<Frozen<Design>['meta']['id']>().toEqualTypeOf<Design['meta']['id']>()
  })
})

describe('Mutable', () => {
  it('undoes Frozen', () => {
    expectTypeOf<Mutable<Frozen<Design>>>().toEqualTypeOf<Design>()
  })
})
