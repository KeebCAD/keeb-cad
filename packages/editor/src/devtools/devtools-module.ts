import type { Module } from '@keeb-cad/di'

import { DesignLocationInspectable } from './design-location-inspectable'
import { DesignStoreInspectable } from './design-store-inspectable'
import { DevtoolsPlugin } from './devtools-plugin'
import { FlowsInspectable } from './flows-inspectable'
import { SelectionInspectable } from './selection-inspectable'
import { SlideOutInspectable } from './slide-out-inspectable'
import { inspectables } from './tokens'
import { ViewportInspectable } from './viewport-inspectable'

export const devtoolsModule: Module = {
  register(container) {
    container.register(DevtoolsPlugin).useClass(DevtoolsPlugin)
    container.register(inspectables).useClass(DesignStoreInspectable)
    container.register(inspectables).useClass(DesignLocationInspectable)
    container.register(inspectables).useClass(SlideOutInspectable)
    container.register(inspectables).useClass(SelectionInspectable)
    container.register(inspectables).useClass(ViewportInspectable)
    container.register(inspectables).useClass(FlowsInspectable)
  },
}
