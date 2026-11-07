import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { aWorkspace } from './workspace'

describe('aWorkspace', () => {
  it.each([
    ['its default when given none', () => aWorkspace(), 'layout'],
    ['its argument', () => aWorkspace('pcb'), 'pcb'],
  ])('returns %s', (_role, build, expected) => {
    expect(build()).toBe(expected)
  })

  it('throws on a value its schema refuses', () => {
    expect(() => aWorkspace('bogus')).toThrow(v.ValiError)
  })
})
