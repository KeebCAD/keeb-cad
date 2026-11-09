import { aBlueprintDesignPart, aDesign, anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { deletePart } from './delete-part'

describe('deletePart', () => {
  it('refuses the part meta.defaultPart names, naming it, and leaves the design', () => {
    const design = aDesign()

    const rejection = deletePart(design, anId('key'))

    expect(rejection).toEqual({
      kind: 'default-part-required',
      ids: [anId('key')],
      message: 'The part "key" is the design\'s default part and can\'t be deleted.',
    })
    expect(design).toEqual(aDesign())
  })

  it('removes another part', () => {
    const other = aBlueprintDesignPart({ id: anId('other') })
    const design = aDesign({ parts: [aBlueprintDesignPart(), other] })

    expect(deletePart(design, anId('other'))).toBeUndefined()
    expect(design.parts).toEqual([aBlueprintDesignPart()])
  })
})
