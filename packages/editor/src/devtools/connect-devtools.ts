import type { Injector } from '@keeb-cad/di'
import { setupDevToolsPlugin } from '@vue/devtools-api'
import type { App } from 'vue'

import { DevtoolsPlugin } from './devtools-plugin'
import { devtoolsPluginId } from './plugin-id'

export function connectDevtools(app: App, injector: Injector): void {
  setupDevToolsPlugin({ id: devtoolsPluginId, label: 'keeb-cad', app }, (api) => {
    injector.resolve(DevtoolsPlugin).setup(api)
  })
}
