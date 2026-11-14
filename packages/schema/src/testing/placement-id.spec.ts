import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { aPlacementId } from './placement-id'

describe('aPlacementId', () => {
  it.each([
    ['its default when given none', () => aPlacementId(), 'left/id'],
    ['its argument', () => aPlacementId('right/x'), 'right/x'],
  ])('returns %s', (_role, build, expected) => {
    expect(build()).toBe(expected)
  })

  it('throws on a value its schema refuses', () => {
    expect(() => aPlacementId('top/x')).toThrow(v.ValiError)
  })
})
