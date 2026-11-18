import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { chainPosition } from './chain-position'

describe('chainPosition', () => {
  it('reads the chain and the 1-based place in it', () => {
    expect(chainPosition({ parent: anId('thumb'), index: 1, count: 3 })).toBe(
      'chain thumb · 2 of 3',
    )
  })
})
