import { SetArrangement, SetOffset } from '@keeb-cad/commands'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import type { Node } from '@keeb-cad/schema'
import {
  aChainGroup,
  aDelta,
  aDesign,
  aFreeGroup,
  aLayout,
  anId,
  anOffset,
  aSlot,
  aVec2,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { arrangeStore } from './testing/arrange-store'
import { committed } from './testing/committed'

const A = anId('a')
const G = anId('g')

async function arrange(children: Node[]) {
  const store = await arrangeStore(new Container())
  expectOk(
    store.replaceDesign({ design: aDesign({ layout: aLayout({ children }) }), unreadable: [] }),
  )
  return store
}

describe('editing a node', () => {
  it("commits layout.setOffset through main's modules", async () => {
    const store = await arrange([aSlot({ id: A })])

    expectOk(store.run(SetOffset, { ids: [A], position: { x: '5mm' } }))

    expect(committed(store).design.layout.children).toEqual([
      aSlot({
        id: A,
        offset: anOffset({ position: aVec2({ x: aDelta('5mm'), y: aDelta('0mm') }) }),
      }),
    ])
  })

  it("commits layout.setArrangement through main's modules", async () => {
    const store = await arrange([aFreeGroup({ id: G })])

    expectOk(store.run(SetArrangement, { ids: [G], arrangement: 'chain', axis: 'x' }))

    expect(committed(store).design.layout.children).toEqual([aChainGroup({ id: G, axis: 'x' })])
  })
})
