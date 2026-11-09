import { aBlueprintDeclaration, aVersion } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { groupDeclarations } from './group-declarations'

describe('groupDeclarations', () => {
  it('holds every version of a blueprint under its id', () => {
    const first = aBlueprintDeclaration()
    const second = aBlueprintDeclaration({ version: aVersion(2) })

    expect(groupDeclarations([first, second])).toEqual({ [first.id]: { 1: first, 2: second } })
  })

  it('is empty for no declarations', () => {
    expect(groupDeclarations([])).toEqual({})
  })
})
