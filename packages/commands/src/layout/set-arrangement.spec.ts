import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Group } from '@keeb-cad/schema'
import { aChainGroup, aDesign, aFreeGroup, aLayout, anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { layoutCommandsModule } from './layout-commands-module'
import { SetArrangement } from './set-arrangement'

const G = anId('g')
const H = anId('h')

async function arrange(children: Group[]) {
  const container = new Container().addModule(designModule).addModule(layoutCommandsModule)
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  expectOk(
    store.replaceDesign({ design: aDesign({ layout: aLayout({ children }) }), unreadable: [] }),
  )
  const groups = () => store.current.getOrUndefined()?.design.layout.children
  return { store, groups }
}

describe('SetArrangement', () => {
  it('has the command id layout.setArrangement and the label Set arrangement', () => {
    expect({ id: SetArrangement.id, label: SetArrangement.label }).toEqual({
      id: 'layout.setArrangement',
      label: 'Set arrangement',
    })
  })
})

describe('SetArrangement through the store', () => {
  it('arranges every named group in one undo entry', async () => {
    const arranged = [aFreeGroup({ id: G }), aChainGroup({ id: H, axis: 'x' })]
    const { store, groups } = await arrange(arranged)

    expectOk(store.run(SetArrangement, { ids: [G, H], arrangement: 'chain', axis: 'y' }))
    const set = groups()
    expectOk(store.undo())

    expect({ set, undone: groups() }).toEqual({
      set: [aChainGroup({ id: G, axis: 'y' }), aChainGroup({ id: H, axis: 'y' })],
      undone: arranged,
    })
    expectErr(store.undo())
  })

  // As data, as a script names it, since the types refuse these inputs.
  it.each([
    ['a chain with no axis', { ids: [G], arrangement: 'chain' }],
    ['a free group with an axis', { ids: [G], arrangement: 'free', axis: 'x' }],
  ])('refuses %s with input-invalid', async (_role, input) => {
    const { store } = await arrange([aFreeGroup({ id: G })])

    const result = store.runById(SetArrangement.id, input)

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'input-invalid', command: 'layout.setArrangement' })
  })
})
