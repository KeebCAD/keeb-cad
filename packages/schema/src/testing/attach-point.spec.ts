import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { anAttachPoint } from './attach-point'

describe('anAttachPoint', () => {
  it.each([
    ['its default when given none', () => anAttachPoint(), 'center'],
    ['its argument', () => anAttachPoint('corner-br'), 'corner-br'],
  ])('returns %s', (_role, build, expected) => {
    expect(build()).toBe(expected)
  })

  it('throws on a value its schema refuses', () => {
    expect(() => anAttachPoint('edge-middle')).toThrow(v.ValiError)
  })
})
