import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import { aLayoutRow, anId, aPartsOutput, aSlot } from '@keeb-cad/schema/testing'
import { ModelWorkerLifecycle, workersModule } from '@keeb-cad/workers'
import { FakeWorker } from '@keeb-cad/workers/testing'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { designOf } from '../../testing/designs'
import { layoutOf } from '../../testing/layout-rows'
import { postLayoutSet } from '../../testing/post-layout-set'
import { useNewDesignHint } from './use-new-design-hint'
import { usePlacedNodes } from './use-placed-nodes'

type Arrangement = { slots: number; posted?: { placed: boolean } }

// The design's slots, and, when posted, a set placing slot a or leaving it unplaced.
async function arrange({ slots, posted }: Arrangement) {
  const container = new Container().addModule(designModule).addModule(workersModule)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  const children = slots === 0 ? [] : [aSlot({ id: anId('a') })]
  expectOk(store.replaceDesign({ design: designOf(children), unreadable: [] }))
  const worker = new FakeWorker()
  container.resolve(ModelWorkerLifecycle).start(() => worker)
  if (posted !== undefined) {
    const seq = store.current.map((current) => current.seq).getOr(-1)
    const layout = layoutOf({ a: aLayoutRow({ placed: posted.placed }) })
    postLayoutSet(worker, { seq, layout, parts: aPartsOutput({ ids: ['key@a'] }) })
  }
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  return app.runWithContext(() => useNewDesignHint(usePlacedNodes()))
}

describe('useNewDesignHint', () => {
  it.each([
    ['shows with no set and no slot in the design', { slots: 0 }, true],
    ['hides with no set and one slot in the design', { slots: 1 }, false],
    ['shows with a set that places no slot', { slots: 1, posted: { placed: false } }, true],
    ['hides with a set that places one slot', { slots: 1, posted: { placed: true } }, false],
  ])('%s', async (_role, arrangement: Arrangement, expected) => {
    const hint = await arrange(arrangement)

    expect(hint.value).toBe(expected)
  })
})
