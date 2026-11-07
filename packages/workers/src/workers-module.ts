import type { Module } from '@keeb-cad/di'
import { Dispatcher } from '@keeb-cad/messaging'
import { designKinds, wholeKind } from '@keeb-cad/protocol'

import { ModelWorkerLifecycle } from './model-worker/model-worker-lifecycle'

export const workersModule: Module = {
  register(container) {
    container.register(Dispatcher).useFactory(() => new Dispatcher({ designKinds, wholeKind }))
    container.register(ModelWorkerLifecycle).useClass(ModelWorkerLifecycle)
  },
}
