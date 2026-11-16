import { checkDeletePart } from '@keeb-cad/model/main'
import { aBlueprintDesignPart, aDesign, aMeta, anId, aPartRef } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { settled } from '../testing/settled'
import { DeletePart } from './delete-part'

describe('DeletePart', () => {
  it("refuses meta.defaultPart's part naming key, the draft unchanged", () => {
    const draft = aDesign()

    const rejection = new DeletePart().apply(draft, { id: anId('key') })

    expect(rejection).toMatchObject({ kind: 'default-part-required', ids: ['key'] })
    expect(draft).toEqual(aDesign())
  })

  it('removes another part named by no slot or group', () => {
    const draft = aDesign({
      parts: [aBlueprintDesignPart(), aBlueprintDesignPart({ id: anId('other') })],
    })

    new DeletePart().apply(draft, { id: anId('other') })

    expect(draft.parts).toEqual([aBlueprintDesignPart()])
  })
})

describe('DeletePart availability', () => {
  it.each([
    ['the default part', 'key'],
    ['another part', 'other'],
  ])('gives what its check gives for %s', (_role, id) => {
    const design = aDesign({
      meta: aMeta({ defaultPart: aPartRef('key') }),
      parts: [
        aBlueprintDesignPart({ id: anId('key') }),
        aBlueprintDesignPart({ id: anId('other') }),
      ],
    })

    expect(settled(new DeletePart().available(design, { id: anId(id) }))).toEqual(
      settled(checkDeletePart(design, anId(id))),
    )
  })
})
