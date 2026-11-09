import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { blueprintDeclarationSchema } from '../blueprint-declaration'
import { aBlueprintDeclaration } from './blueprint-declaration'
import { aVersion } from './version'

describe('aBlueprintDeclaration', () => {
  it('is valid by default', () => {
    expect(v.safeParse(blueprintDeclarationSchema, aBlueprintDeclaration()).success).toBe(true)
  })

  it('takes overrides', () => {
    expect(aBlueprintDeclaration({ version: aVersion(2) })).toMatchObject({ version: 2 })
  })
})
