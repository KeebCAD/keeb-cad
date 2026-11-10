import { AddSlot, DeleteNode, layoutCommandsModule } from '@keeb-cad/commands'
import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import type { Id } from '@keeb-cad/schema'
import { aDesign, aLayout, anId, aSlot } from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished } from 'vitest'

import { Selection } from './selection'

const A = anId('a')
const B = anId('b')

async function arrange(selected: readonly Id[]) {
  const container = new Container().addModule(designModule).addModule(layoutCommandsModule)
  container.register(Selection).useClass(Selection)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  const design = aDesign({ layout: aLayout({ children: [aSlot({ id: A }), aSlot({ id: B })] }) })
  expectOk(store.replaceDesign({ design, unreadable: [] }))
  const selection = container.resolve(Selection)
  selection.select(selected)
  return { store, selection }
}

describe('Selection', () => {
  it('drops a deleted id after DeleteNode, keeping the rest in order', async () => {
    const { store, selection } = await arrange([A, B])

    expectOk(store.run(DeleteNode, { ids: [A] }))

    expect(selection.ids).toEqual([B])
  })

  it('keeps an id a commit leaves in the design', async () => {
    const { store, selection } = await arrange([A])

    expectOk(store.run(AddSlot, { id: 'c' }))

    expect(selection.ids).toEqual([A])
  })

  it('drops an id a design swapped in by replaceDesign no longer holds', async () => {
    const { store, selection } = await arrange([A])

    expectOk(store.replaceDesign({ design: aDesign(), unreadable: [] }))

    expect(selection.ids).toEqual([])
  })
})
