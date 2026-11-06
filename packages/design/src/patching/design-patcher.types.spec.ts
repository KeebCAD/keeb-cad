import { type Design, type Mutable } from '@keeb-cad/schema'
import { describe, expectTypeOf, it } from 'vitest'

import type { Writable } from './types'

describe('Writable', () => {
  it('is assignable to Mutable', () => {
    expectTypeOf<Writable<Design>>().toExtend<Mutable<Design>>()
  })
})
