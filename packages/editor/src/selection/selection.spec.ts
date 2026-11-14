import { DeleteNode, layoutCommandsModule } from '@keeb-cad/commands'
import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import type { PlacementId } from '@keeb-cad/schema'
import {
  aDesign,
  aLayout,
  aMeta,
  anId,
  aPlacementId,
  aSlot,
  aUnibodyForm,
} from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished } from 'vitest'

import { Selection } from './selection'

const A = anId('a')
const B = anId('b')
const LEFT_A = aPlacementId('left/a')
const RIGHT_A = aPlacementId('right/a')

async function arrange(selected: readonly PlacementId[]) {
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
  it.each([
    ['a left', LEFT_A],
    ['a right', RIGHT_A],
  ])('drops %s id of a node DeleteNode deletes', async (_role, selected) => {
    const { store, selection } = await arrange([selected])

    expectOk(store.run(DeleteNode, { ids: [A] }))

    expect(selection.ids).toEqual([])
  })

  it.each([
    ['a left', LEFT_A],
    ['a right', RIGHT_A],
  ])('keeps %s id of a node a commit leaves in the design', async (_role, selected) => {
    const { store, selection } = await arrange([selected])

    expectOk(store.run(DeleteNode, { ids: [B] }))

    expect(selection.ids).toEqual([selected])
  })

  it('drops an id a design swapped in by replaceDesign no longer holds', async () => {
    const { store, selection } = await arrange([LEFT_A])

    expectOk(store.replaceDesign({ design: aDesign(), unreadable: [] }))

    expect(selection.ids).toEqual([])
  })

  it('drops an id whose side a design swapped in by replaceDesign no longer has', async () => {
    const { store, selection } = await arrange([LEFT_A])
    const unibody = aDesign({
      meta: aMeta({ form: aUnibodyForm() }),
      layout: aLayout({ children: [aSlot({ id: A }), aSlot({ id: B })] }),
    })

    expectOk(store.replaceDesign({ design: unibody, unreadable: [] }))

    expect(selection.ids).toEqual([])
  })
})
