import { describe, it } from 'vitest'

import { expectDeeplyFrozen, emptyLayoutDesign } from '../testing'
import { deepFreeze } from './deep-freeze'

describe('deepFreeze', () => {
  it('freezes every nested object of the value it returns', () => {
    const value = emptyLayoutDesign()

    expectDeeplyFrozen(deepFreeze(value))
  })
})
