import type { Injector } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { useThemeChoice } from '@keeb-cad/ui'
import { createApp } from 'vue'

import App from './App.vue'
import { createEditorRouter } from './router/create-editor-router'
import type { DesignLocation } from './types'
import './styles.css'

export function mountEditor(selector: string, injector: Injector): DesignLocation {
  const app = createApp(App)
  const router = createEditorRouter()

  provideInjectorOnApp(app, injector)
  app.use(router)

  useThemeChoice()
  app.mount(selector)
  return router
}
