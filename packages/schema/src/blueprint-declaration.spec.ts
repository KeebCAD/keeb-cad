import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { blueprintDeclarationSchema } from './blueprint-declaration'
import { aBlueprintDeclaration } from './testing'

describe('blueprintDeclarationSchema', () => {
  it('passes a declaration', () => {
    expect(v.safeParse(blueprintDeclarationSchema, aBlueprintDeclaration()).success).toBe(true)
  })

  it('passes nets, whose type is not yet defined', () => {
    const declaration = { ...aBlueprintDeclaration(), nets: {} }

    expect(v.safeParse(blueprintDeclarationSchema, declaration).success).toBe(true)
  })

  it('refuses a lane for an unknown stage', () => {
    const declaration = { ...aBlueprintDeclaration(), lanes: { routing: {} } }

    expect(v.safeParse(blueprintDeclarationSchema, declaration).success).toBe(false)
  })
})
