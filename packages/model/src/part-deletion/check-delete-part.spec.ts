import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { aBlueprintDesignPart, aDesign, anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkDeletePart } from './check-delete-part'

function arrange() {
  return aDesign({ parts: [aBlueprintDesignPart(), aBlueprintDesignPart({ id: anId('other') })] })
}

describe('checkDeletePart', () => {
  it('refuses the part meta.defaultPart names with default-part-required naming it', () => {
    const result = checkDeletePart(arrange(), anId('key'))

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'default-part-required',
      ids: [anId('key')],
      message: 'The part "key" is the design\'s default part and can\'t be deleted.',
    })
  })

  it('accepts another part', () => {
    expectOk(checkDeletePart(arrange(), anId('other')))
  })
})
