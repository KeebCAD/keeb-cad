import type { Module } from '@keeb-cad/di'
import { Dispatcher } from '@keeb-cad/messaging'
import { designKinds, wholeKind } from '@keeb-cad/protocol'

import { BlueprintPause } from './pause/blueprint-pause'
import { Pipeline } from './pipeline/pipeline'

export const pipelineModule: Module = {
  register(container) {
    container.register(Dispatcher).useFactory(() => new Dispatcher({ designKinds, wholeKind }))
    container.register(BlueprintPause).useClass(BlueprintPause)
    container.register(Pipeline).useClass(Pipeline)
  },
}
