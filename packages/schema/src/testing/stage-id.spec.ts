import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { aStageId } from './stage-id'

describe('aStageId', () => {
  it.each([
    ['its default when given none', () => aStageId(), 'parts'],
    ['its argument', () => aStageId('plates'), 'plates'],
  ])('returns %s', (_role, build, expected) => {
    expect(build()).toBe(expected)
  })

  it('throws on a value its schema refuses', () => {
    expect(() => aStageId('routing')).toThrow(v.ValiError)
  })
})
