import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { laneDeclarationSchema } from './lane-declaration'
import { aLaneDeclaration } from './testing'

const output = { name: 'a', role: 'cutout', kind: 'shape', count: 'one' } as const

describe('laneDeclarationSchema', () => {
  it.each([
    ['two outputs of one name', [output, output], false],
    ['an empty output list', [], true],
    ['two outputs of different names', [output, { ...output, name: 'b' }], true],
    ['a purpose, whose type is not yet defined', [{ ...output, purpose: 'x' }], true],
  ])('on %s', (_role, outputs, expected) => {
    expect(v.safeParse(laneDeclarationSchema, aLaneDeclaration({ outputs })).success).toBe(expected)
  })
})
