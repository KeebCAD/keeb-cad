import { aPlacementId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { selectsRightHalf } from './selects-right-half'

describe('selectsRightHalf', () => {
  it.each([
    ['nothing selected', [], false],
    ['a left id', ['left/a'], false],
    ['a unibody id', ['whole/a'], false],
    ['a right id', ['right/a'], true],
    ['a left and a right id', ['left/a', 'right/b'], true],
  ])('on %s gives %s', (_role, ids, expected) => {
    expect(selectsRightHalf(ids.map(aPlacementId))).toBe(expected)
  })
})
