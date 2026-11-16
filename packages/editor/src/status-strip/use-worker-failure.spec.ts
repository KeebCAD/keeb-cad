import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign } from '@keeb-cad/schema/testing'
import { ModelWorkerLifecycle, workersModule } from '@keeb-cad/workers'
import { FakeWorker } from '@keeb-cad/workers/testing'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { useWorkerFailure } from './use-worker-failure'

const MESSAGE = 'boom'
// The lifecycle gives up on the third crash in a row.
const CRASH_CAP = 3

async function arrange() {
  const container = new Container().addModule(designModule).addModule(workersModule)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  expectOk(store.replaceDesign({ design: aDesign(), unreadable: [] }))
  const spawned: FakeWorker[] = []
  container.resolve(ModelWorkerLifecycle).start(() => {
    const worker = new FakeWorker()
    spawned.push(worker)
    return worker
  })
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  const seq = store.current.map((current) => current.seq).getOr(-1)
  const latest = () => {
    const worker = spawned.at(-1)
    if (worker === undefined) throw new Error('Expected a spawned worker.')
    return worker
  }
  // Each crash before the cap respawns, so every crash goes to the latest worker.
  const fail = (stage?: 'plates') => {
    for (let crash = 1; crash <= CRASH_CAP; crash += 1) {
      if (stage !== undefined && crash === CRASH_CAP) {
        latest().post({ kind: 'stage-started', epoch: spawned.length, seq, stage })
      }
      latest().crash(MESSAGE)
    }
  }
  return { app, fail }
}

describe('useWorkerFailure', () => {
  it('holds nothing while the worker runs', async () => {
    const { app } = await arrange()

    const failure = app.runWithContext(() => useWorkerFailure())

    expect(failure.value).toBeUndefined()
  })

  it('names the stage the worker failed in', async () => {
    const { app, fail } = await arrange()
    const failure = app.runWithContext(() => useWorkerFailure())

    fail('plates')

    expect(failure.value).toBe(`failed: plates: ${MESSAGE}`)
  })

  it('reads the message alone for a failure in no stage', async () => {
    const { app, fail } = await arrange()
    const failure = app.runWithContext(() => useWorkerFailure())

    fail()

    expect(failure.value).toBe(`failed: ${MESSAGE}`)
  })
})
