import type { DesignStore } from '@keeb-cad/design'
import type { Container } from '@keeb-cad/di'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { onTestFinished } from 'vitest'

import { arrangeStore } from './arrange-store'

// Main's modules on the given container, running the real model worker until the test ends.
export async function arrangeModelWorker(
  container: Container,
): Promise<{ store: DesignStore; lifecycle: ModelWorkerLifecycle }> {
  const store = await arrangeStore(container)
  const lifecycle = container.resolve(ModelWorkerLifecycle)
  lifecycle.start(() => {
    const worker = new Worker(new URL('../model.worker.ts', import.meta.url), { type: 'module' })
    onTestFinished(() => worker.terminate())
    return worker
  })
  return { store, lifecycle }
}
