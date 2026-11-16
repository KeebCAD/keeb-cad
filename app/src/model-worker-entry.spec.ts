import { NewDesign } from '@keeb-cad/commands'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { describe, expect, it, onTestFinished } from 'vitest'

import { arrangeStore } from './testing/arrange-store'

async function arrange() {
  const container = new Container()
  const store = await arrangeStore(container)
  return { store, lifecycle: container.resolve(ModelWorkerLifecycle) }
}

describe("the model worker's entry", () => {
  it('answers the first design main sends it', async () => {
    const { store, lifecycle } = await arrange()
    const posts: unknown[] = []
    const spawn = () => {
      const worker = new Worker(new URL('model.worker.ts', import.meta.url), { type: 'module' })
      worker.addEventListener('message', (event) => posts.push(event.data))
      onTestFinished(() => worker.terminate())
      return worker
    }
    lifecycle.start(spawn)

    expectOk(await store.run(NewDesign, {}))

    // The worker's first load has Vite transform its whole module graph on demand, which took
    // over two seconds while the rest of the suite ran beside it.
    await expect
      .poll(() => posts, { timeout: 10_000 })
      .toContainEqual({ kind: 'issues', epoch: 1, seq: 1, violations: [] })
  })
})
