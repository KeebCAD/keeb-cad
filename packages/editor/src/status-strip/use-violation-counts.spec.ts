import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign, aViolation } from '@keeb-cad/schema/testing'
import { ModelWorkerLifecycle, workersModule } from '@keeb-cad/workers'
import { FakeWorker } from '@keeb-cad/workers/testing'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { useViolationCounts } from './use-violation-counts'

async function arrange() {
  const container = new Container().addModule(designModule).addModule(workersModule)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  const commit = () => expectOk(store.replaceDesign({ design: aDesign(), unreadable: [] }))
  commit()
  const worker = new FakeWorker()
  container.resolve(ModelWorkerLifecycle).start(() => worker)
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  // One error and one warning, at main's seq when posted.
  const postIssues = () => {
    worker.post({
      kind: 'issues',
      epoch: 1,
      seq: store.current.map(({ seq }) => seq).getOr(-1),
      violations: [aViolation({ severity: 'error' }), aViolation({ severity: 'warning' })],
    })
  }
  return { app, commit, postIssues }
}

describe('useViolationCounts', () => {
  it("dims the counts of issues posted behind main's seq", async () => {
    const { app, commit, postIssues } = await arrange()
    postIssues()
    commit()

    const counts = app.runWithContext(() => useViolationCounts())

    expect(counts.value).toEqual({ errors: 1, warnings: 1, dimmed: true })
  })

  it("shows undimmed the counts of issues posted at main's seq", async () => {
    const { app, postIssues } = await arrange()
    postIssues()

    const counts = app.runWithContext(() => useViolationCounts())

    expect(counts.value).toEqual({ errors: 1, warnings: 1, dimmed: false })
  })

  it('dims zero counts before any issues are posted', async () => {
    const { app } = await arrange()

    const counts = app.runWithContext(() => useViolationCounts())

    expect(counts.value).toEqual({ errors: 0, warnings: 0, dimmed: true })
  })
})
