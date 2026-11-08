import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import { ModelWorkerLifecycle, type ModelWorkerStatus, workersModule } from '@keeb-cad/workers'
import { RecordingModelWorkerLifecycle } from '@keeb-cad/workers/testing'
import { describe, expect, it } from 'vitest'

import { modelWorkerActionsModule } from './model-worker-actions-module'
import { RestartModelWorker } from './restart-model-worker'

async function arrange() {
  const container = new Container()
    .addModule(designModule)
    .addModule(workersModule)
    .addModule(modelWorkerActionsModule)
  container.register(RecordingModelWorkerLifecycle).useClass(RecordingModelWorkerLifecycle)
  container
    .override(ModelWorkerLifecycle)
    .useFactory(() => container.resolve(RecordingModelWorkerLifecycle))
  await container.autoLoad()
  return {
    store: container.resolve(DesignStore),
    lifecycle: container.resolve(RecordingModelWorkerLifecycle),
    action: container.resolve(RestartModelWorker),
  }
}

describe('RestartModelWorker', () => {
  it.each<[string, ModelWorkerStatus, boolean]>([
    ['unavailable while idle', 'idle', false],
    ['available while running', 'running', true],
    ['available while failed', { message: 'boom' }, true],
  ])('is %s', async (_role, status, expected) => {
    const { store, lifecycle } = await arrange()
    lifecycle.setStatus(status)

    expect(store.available(RestartModelWorker)).toBe(expected)
  })

  it('restarts the lifecycle once', async () => {
    const { lifecycle, action } = await arrange()

    expectOk(await action.apply({}))

    expect(lifecycle.restarts).toBe(1)
  })
})
