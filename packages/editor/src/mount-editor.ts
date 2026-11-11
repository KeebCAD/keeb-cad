import type { Injector } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { InvariantError } from '@keeb-cad/result'
import { useThemeChoice } from '@keeb-cad/ui'
import { createApp } from 'vue'
import type { Router } from 'vue-router'

import App from './App.vue'
import { DesignLocation } from './router/design-location'
import './styles.css'

export function mountEditor(selector: string, injector: Injector): Router {
  const root = document.querySelector<HTMLElement>(selector)
  if (root === null)
    throw new InvariantError(`No element matches "${selector}" to mount the editor.`)
  const app = createApp(App, { root })
  const { router } = injector.resolve(DesignLocation)

  provideInjectorOnApp(app, injector)
  app.use(router)

  if (import.meta.env.MODE === 'development')
    void import('./devtools/connect-devtools').then(({ connectDevtools }) =>
      connectDevtools(app, injector),
    )

  useThemeChoice()
  app.mount(root)
  return router
}
