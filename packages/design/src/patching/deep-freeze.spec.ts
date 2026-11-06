import { aDesign } from '@keeb-cad/schema/testing'
import { describe, it } from 'vitest'

import { expectDeeplyFrozen } from '../testing'
import { deepFreeze } from './deep-freeze'

describe('deepFreeze', () => {
  it('freezes every nested object of the value it returns', () => {
    const value = aDesign()

    expectDeeplyFrozen(deepFreeze(value))
  })
})
