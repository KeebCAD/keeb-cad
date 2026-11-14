import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { aSideId } from './side-id'

describe('aSideId', () => {
  it.each([
    ['its default when given none', () => aSideId(), 'left/id'],
    ['its argument', () => aSideId('right/b'), 'right/b'],
  ])('returns %s', (_role, build, expected) => {
    expect(build()).toBe(expected)
  })

  it('throws on a value its schema refuses', () => {
    expect(() => aSideId('whole/b')).toThrow(v.ValiError)
  })
})
