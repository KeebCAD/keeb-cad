import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import {
  aFreeGroup,
  aLayoutRow,
  anId,
  aPartsOutput,
  aSlot,
  aSlotSpace,
} from '@keeb-cad/schema/testing'
import { ModelWorkerLifecycle, workersModule } from '@keeb-cad/workers'
import { FakeWorker } from '@keeb-cad/workers/testing'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { designOf } from '../../testing/designs'
import { layoutOf } from '../../testing/layout-rows'
import { postLayoutSet } from '../../testing/post-layout-set'
import { usePlacedNodes } from './use-placed-nodes'

const SLOT_FRAME = { x: 5, y: 6, rot: 0, mirrored: false }
const SLOT_ANCHOR = { x: 1, y: 2 }
const GROUP_FRAME = { x: 3, y: 4, rot: 0, mirrored: false }
const GROUP_ANCHOR = { x: 7, y: 8 }
const SLOT_SPACE = aSlotSpace({ height: 19 })

// The root holding group g, which holds slot a.
async function arrange() {
  const container = new Container().addModule(designModule).addModule(workersModule)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  const design = designOf([aFreeGroup({ id: anId('g'), children: [aSlot({ id: anId('a') })] })])
  expectOk(store.replaceDesign({ design, unreadable: [] }))
  const worker = new FakeWorker()
  container.resolve(ModelWorkerLifecycle).start(() => worker)
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  const postSet = () => {
    const seq = store.current.map((current) => current.seq).getOr(-1)
    const layout = layoutOf({
      a: aLayoutRow({ frame: SLOT_FRAME, anchorAt: SLOT_ANCHOR }),
      g: aLayoutRow({ kind: 'group', part: -1, frame: GROUP_FRAME, anchorAt: GROUP_ANCHOR }),
    })
    postLayoutSet(worker, {
      seq,
      layout,
      parts: aPartsOutput({ ids: ['key@a'], rows: [SLOT_SPACE] }),
    })
  }
  return { app, postSet }
}

describe('usePlacedNodes', () => {
  it('holds nothing before a set arrives', async () => {
    const { app } = await arrange()

    const placed = app.runWithContext(() => usePlacedNodes())

    expect(placed.value).toEqual([])
  })

  it("holds the set's placed rows in posted order, sized from the parts, and no row for the root", async () => {
    const { app, postSet } = await arrange()
    const placed = app.runWithContext(() => usePlacedNodes())

    postSet()

    expect(placed.value).toEqual([
      {
        kind: 'slot',
        id: 'a',
        key: 'left/a',
        frame: SLOT_FRAME,
        anchorAt: SLOT_ANCHOR,
        slotSpace: SLOT_SPACE,
        fit: 'fitted',
      },
      {
        kind: 'group',
        id: 'g',
        key: 'left/g',
        frame: GROUP_FRAME,
        anchorAt: GROUP_ANCHOR,
        border: [],
      },
    ])
  })
})
