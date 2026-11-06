import { describe, expectTypeOf, it } from 'vitest'

import type { Design, Frozen, Mutable } from './types'

describe('Frozen', () => {
  it('makes a nested object read-only', () => {
    expectTypeOf<Frozen<Design>['meta']['form']>().toEqualTypeOf<Readonly<Design['meta']['form']>>()
  })

  it('keeps a branded id branded', () => {
    expectTypeOf<Frozen<Design>['meta']['id']>().toEqualTypeOf<Design['meta']['id']>()
  })
})

describe('Mutable', () => {
  it('undoes Frozen', () => {
    expectTypeOf<Mutable<Frozen<Design>>>().branded.toEqualTypeOf<Design>()
  })
})
