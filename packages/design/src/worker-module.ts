import type { Module } from '@keeb-cad/di'

import { DesignMirror } from './mirror/design-mirror'
import { DesignMirrorWriter } from './mirror/design-mirror-writer'
import { MirrorState } from './mirror/mirror-state'
import { DesignPatcher } from './patching/design-patcher'

export const designWorkerModule: Module = {
  register(container) {
    container.register(DesignPatcher).useClass(DesignPatcher)
    container.register(MirrorState).useClass(MirrorState)
    container.register(DesignMirror).useClass(DesignMirror)
    container.register(DesignMirrorWriter).useClass(DesignMirrorWriter)
  },
}
