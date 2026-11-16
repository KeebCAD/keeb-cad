import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign } from '@keeb-cad/schema/testing'
import { ModelWorkerLifecycle, workersModule } from '@keeb-cad/workers'
import { FakeWorker } from '@keeb-cad/workers/testing'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createApp, effectScope, nextTick } from 'vue'

import { useRunningStage } from './use-running-stage'

// Time is frozen before the worker's post, which the lifecycle stamps with the current time.
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
  vi.useFakeTimers()
  const scope = effectScope()
  onTestFinished(() => {
    scope.stop()
    vi.useRealTimers()
  })
  const runningStage = scope.run(() => app.runWithContext(() => useRunningStage()))
  if (runningStage === undefined) throw new Error('The scope ran nothing.')
  const startParts = () => {
    const seq = store.current.map((current) => current.seq).getOr(-1)
    worker.post({ kind: 'stage-started', epoch: 1, seq, stage: 'parts' })
  }
  return { runningStage, startParts }
}

async function advance(milliseconds: number): Promise<void> {
  vi.advanceTimersByTime(milliseconds)
  await nextTick()
}

describe('useRunningStage', () => {
  it('holds nothing while no stage has started', async () => {
    const { runningStage } = await arrange()

    expect(runningStage.value).toBeUndefined()
  })

  it.each([
    ['just below the threshold', 999],
    ['on the threshold', 1000],
  ])('holds nothing for a stage started %s ago', async (_role, milliseconds) => {
    const { runningStage, startParts } = await arrange()
    startParts()

    await advance(milliseconds)

    expect(runningStage.value).toBeUndefined()
  })

  it.each([
    ['just above the threshold', 1001, '1 s'],
    ['just below the second step', 1999, '1 s'],
    ['on the second step', 2000, '2 s'],
    ['just above the second step', 2001, '2 s'],
  ])(
    'holds the stage and its whole seconds elapsed for a stage started %s ago',
    async (_role, milliseconds, expectedElapsed) => {
      const { runningStage, startParts } = await arrange()
      startParts()

      await advance(milliseconds)

      expect(runningStage.value).toEqual({ stage: 'parts', elapsed: expectedElapsed })
    },
  )
})
