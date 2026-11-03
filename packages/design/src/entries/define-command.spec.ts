import { designSchema } from '@keeb-cad/schema'
import * as v from 'valibot'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { metaOnlyDesign } from '../testing'
import { defineCommand } from './define-command'

describe('defineCommand', () => {
  it('infers the command id as a literal', () => {
    const rename = defineCommand({
      id: 'test.rename',
      label: 'Rename',
      input: v.object({ name: v.string() }),
      apply: () => {},
    })

    expectTypeOf(rename.id).toEqualTypeOf<'test.rename'>()
  })

  it('makes a command with no availability check always available', () => {
    const rename = defineCommand({
      id: 'test.rename',
      label: 'Rename',
      input: v.object({ name: v.string() }),
      apply: () => {},
    })

    expect(rename.available(v.parse(designSchema, metaOnlyDesign()))).toBe(true)
  })
})
