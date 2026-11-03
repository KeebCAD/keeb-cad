import { createApp } from 'vue'

import App from './App.vue'
import router from './router'

/** Mounts the editor shell, with its router, on the element `selector` names. */
export function mountEditor(selector: string): void {
  const app = createApp(App)

  app.use(router)

  app.mount(selector)
}
