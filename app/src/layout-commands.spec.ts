import { AddSlot, DeleteNode, DeletePart, DuplicateNode, NewDesign } from '@keeb-cad/commands'
import { DesignStore } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import {
  aBlueprintDesignPart,
  aDesign,
  aLayout,
  anId,
  aPartRef,
  aSlot,
} from '@keeb-cad/schema/testing'
import { MemoryBackend, storageBackend } from '@keeb-cad/storage/testing'
import { describe, expect, it } from 'vitest'

import { mainModules } from './main-modules'

async function arrange(): Promise<DesignStore> {
  const container = new Container()
  for (const module of mainModules) container.addModule(module)
  container.override(storageBackend).useValue(new MemoryBackend())
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  expectOk(await store.run(NewDesign, {}))
  return store
}

function designOf(store: DesignStore) {
  return store.current.getOrUndefined()?.design
}

describe('the layout commands through mainModules', () => {
  it('refuses a slot on a part the design lacks with unknown-target, the design unchanged', async () => {
    const store = await arrange()
    const before = designOf(store)

    const result = store.run(AddSlot, { id: 'a', part: 'missing' })

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'unknown-target', ids: ['missing'] })
    expect(designOf(store)).toBe(before)
  })

  it('refuses deleting a part a slot uses with unknown-target, the design unchanged', async () => {
    const store = await arrange()
    const other = aBlueprintDesignPart({ id: anId('other') })
    const design = aDesign({
      parts: [aBlueprintDesignPart(), other],
      layout: aLayout({ children: [aSlot({ part: aPartRef('other') })] }),
    })
    expectOk(store.replaceDesign({ design, unreadable: [] }))
    const before = designOf(store)

    const result = store.run(DeletePart, { id: 'other' })

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'unknown-target', ids: ['other'] })
    expect(designOf(store)).toBe(before)
  })

  it('commits DuplicateNode', async () => {
    const store = await arrange()
    expectOk(store.run(AddSlot, { id: 'a' }))

    expectOk(store.run(DuplicateNode, { id: 'a' }))

    expect(designOf(store)?.layout.children).toEqual([{ id: 'a' }, { id: 'a-2' }])
  })

  it('commits DeleteNode', async () => {
    const store = await arrange()
    expectOk(store.run(AddSlot, { id: 'a' }))

    expectOk(store.run(DeleteNode, { ids: ['a'] }))

    expect(designOf(store)?.layout.children).toEqual([])
  })
})
