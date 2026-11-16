import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design } from '@keeb-cad/schema'
import { aFreeGroup, anId, aSlot } from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { designOf } from '../testing/designs'
import { useLayoutTree } from './use-layout-tree'

async function arrange(design?: Design) {
  const container = new Container().addModule(designModule)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  if (design !== undefined) {
    expectOk(container.resolve(DesignStore).replaceDesign({ design, unreadable: [] }))
  }
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  return { app }
}

describe('useLayoutTree', () => {
  it('holds no rows while no design is open', async () => {
    const { app } = await arrange()

    const tree = app.runWithContext(() => useLayoutTree())

    expect(tree.value).toEqual([])
  })

  it("holds the root's children as rows, a group's nested, and no row for the root", async () => {
    const { app } = await arrange(
      designOf([
        aFreeGroup({ id: anId('g'), children: [aSlot({ id: anId('a') })] }),
        aSlot({ id: anId('b') }),
      ]),
    )

    const tree = app.runWithContext(() => useLayoutTree())

    expect(tree.value).toEqual([
      {
        id: 'g',
        label: 'g',
        kind: 'group',
        children: [{ id: 'a', label: 'a', kind: 'slot', children: [] }],
      },
      { id: 'b', label: 'b', kind: 'slot', children: [] },
    ])
  })
})
