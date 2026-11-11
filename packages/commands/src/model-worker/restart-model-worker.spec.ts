import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import { ModelWorkerLifecycle, type ModelWorkerStatus, workersModule } from '@keeb-cad/workers'
import { RecordingModelWorkerLifecycle } from '@keeb-cad/workers/testing'
import { describe, expect, it } from 'vitest'

import { settled } from '../testing/settled'
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
  it.each<[string, ModelWorkerStatus, ReturnType<typeof settled>]>([
    ['unavailable while idle', 'idle', { kind: 'unavailable', command: RestartModelWorker.id }],
    ['available while running', 'running', 'ok'],
    ['available while failed', { message: 'boom' }, 'ok'],
  ])('is %s', async (_role, status, expected) => {
    const { store, lifecycle } = await arrange()
    lifecycle.setStatus(status)

    expect(settled(store.available(RestartModelWorker, {}))).toEqual(expected)
  })

  it('restarts the lifecycle once', async () => {
    const { lifecycle, action } = await arrange()

    expectOk(await action.apply({}))

    expect(lifecycle.restarts).toBe(1)
  })
})
