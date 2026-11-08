import type { Injector } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { useThemeChoice } from '@keeb-cad/ui'
import { createApp } from 'vue'
import type { Router } from 'vue-router'

import App from './App.vue'
import { DesignLocation } from './router/design-location'
import './styles.css'

export function mountEditor(selector: string, injector: Injector): Router {
  const app = createApp(App)
  const { router } = injector.resolve(DesignLocation)

  provideInjectorOnApp(app, injector)
  app.use(router)

  useThemeChoice()
  app.mount(selector)
  return router
}
