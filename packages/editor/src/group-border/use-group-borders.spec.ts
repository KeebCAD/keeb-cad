import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design, LayoutOutput } from '@keeb-cad/schema'
import {
  aFreeGroup,
  anId,
  aPartsOutput,
  aPlacementId,
  aSlot,
  aSlotSpace,
} from '@keeb-cad/schema/testing'
import { ModelWorkerLifecycle, workersModule } from '@keeb-cad/workers'
import { FakeWorker } from '@keeb-cad/workers/testing'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { Selection } from '../selection/selection'
import { HoveredNode } from '../hover/hovered-node'
import { designOf } from '../testing/designs'
import { groupRow, keyAt, layoutOf, rectangle } from '../testing/layout-rows'
import { postLayoutSet } from '../testing/post-layout-set'
import { useGroupBorders } from './use-group-borders'

const BORDER = rectangle(-10, -10, 10, 10)

async function arrange(design?: Design) {
  const container = new Container().addModule(designModule).addModule(workersModule)
  container.register(Selection).useClass(Selection)
  container.register(HoveredNode).useClass(HoveredNode)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  if (design !== undefined) expectOk(store.replaceDesign({ design, unreadable: [] }))
  const worker = new FakeWorker()
  container.resolve(ModelWorkerLifecycle).start(() => worker)
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  const post = (layout: LayoutOutput) => {
    postLayoutSet(worker, {
      seq: store.current.map(({ seq }) => seq).getOr(-1),
      layout,
      parts: aPartsOutput({ ids: ['key@a'], rows: [aSlotSpace()] }),
    })
  }
  return { app, post, hovered: container.resolve(HoveredNode) }
}

describe('useGroupBorders', () => {
  it('holds no rows while no design is open', async () => {
    const { app } = await arrange()

    const borders = app.runWithContext(() => useGroupBorders())

    expect(borders.value).toEqual([])
  })

  it("shows the hovered key's group as hovered on its own side only", async () => {
    const { app, post, hovered } = await arrange(
      designOf([aFreeGroup({ id: anId('g'), children: [aSlot({ id: anId('a') })] })]),
    )
    post(
      layoutOf({
        g: groupRow(BORDER),
        a: keyAt(0),
        'right/root': groupRow([]),
        'right/g': groupRow(BORDER),
        'right/a': keyAt(40),
      }),
    )
    const borders = app.runWithContext(() => useGroupBorders())

    hovered.point(aPlacementId('left/a'), 'canvas')

    expect(borders.value).toMatchObject([
      { key: 'left/g', shown: 'hovered' },
      { key: 'right/g', shown: 'none' },
    ])
  })
})
