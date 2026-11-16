import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign, aLayoutOutput, aPartsOutput } from '@keeb-cad/schema/testing'
import { ModelWorkerLifecycle, workersModule } from '@keeb-cad/workers'
import { FakeWorker } from '@keeb-cad/workers/testing'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { postLayoutSet } from '../../testing/post-layout-set'
import { useLayoutSetArrived } from './use-layout-set-arrived'

async function arrange() {
  const container = new Container().addModule(designModule).addModule(workersModule)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  expectOk(store.replaceDesign({ design: aDesign(), unreadable: [] }))
  const worker = new FakeWorker()
  container.resolve(ModelWorkerLifecycle).start(() => worker)
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  const postSet = () => {
    const seq = store.current.map((current) => current.seq).getOr(-1)
    postLayoutSet(worker, { seq, layout: aLayoutOutput(), parts: aPartsOutput() })
  }
  return { app, postSet }
}

describe('useLayoutSetArrived', () => {
  it('is false before any set arrives', async () => {
    const { app } = await arrange()

    const arrived = app.runWithContext(() => useLayoutSetArrived())

    expect(arrived.value).toBe(false)
  })

  it("is true once the set for main's seq arrives", async () => {
    const { app, postSet } = await arrange()
    const arrived = app.runWithContext(() => useLayoutSetArrived())

    postSet()

    expect(arrived.value).toBe(true)
  })
})
