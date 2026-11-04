import { createApp } from 'vue'

import App from './App.vue'
import { createEditorRouter } from './router/create-editor-router'

export function mountEditor(selector: string): void {
  const app = createApp(App)

  app.use(createEditorRouter())

  app.mount(selector)
}
