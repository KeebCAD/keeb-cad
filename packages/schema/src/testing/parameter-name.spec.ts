import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { aParameterName } from './parameter-name'

describe('aParameterName', () => {
  it.each([
    ['its default when given none', () => aParameterName(), 'wall'],
    ['its argument', () => aParameterName('pitch'), 'pitch'],
  ])('returns %s', (_role, build, expected) => {
    expect(build()).toBe(expected)
  })

  it('throws on a value its schema refuses', () => {
    expect(() => aParameterName('mm')).toThrow(v.ValiError)
  })
})
