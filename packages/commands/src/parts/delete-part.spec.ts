import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { checkDeletePart } from '@keeb-cad/model/main'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { aBlueprintDesignPart, aDesign, aMeta, anId, aPartRef } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { settled } from '../testing/settled'
import { DeletePart } from './delete-part'
import { partsCommandsModule } from './parts-commands-module'

async function arrange(design = aDesign()) {
  const container = new Container().addModule(designModule).addModule(partsCommandsModule)
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  expectOk(store.replaceDesign({ design, unreadable: [] }))
  return store
}

describe('DeletePart', () => {
  it("refuses meta.defaultPart's part naming key, the design unchanged", async () => {
    const store = await arrange()
    const before = store.current.getOrUndefined()?.design

    const result = store.run(DeletePart, { id: 'key' })

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'default-part-required', ids: ['key'] })
    expect(store.current.getOrUndefined()?.design).toEqual(before)
  })

  it('removes another part named by no slot or group', async () => {
    const other = aBlueprintDesignPart({ id: anId('other') })
    const store = await arrange(aDesign({ parts: [aBlueprintDesignPart(), other] }))

    expectOk(store.run(DeletePart, { id: 'other' }))

    expect(store.current.getOrUndefined()?.design.parts).toEqual([aBlueprintDesignPart()])
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
