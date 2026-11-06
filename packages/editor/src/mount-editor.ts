import { useThemeChoice } from '@keeb-cad/ui'
import { createApp } from 'vue'

import App from './App.vue'
import { createEditorRouter } from './router/create-editor-router'
import './styles.css'

export function mountEditor(selector: string): void {
  const app = createApp(App)

  app.use(createEditorRouter())

  useThemeChoice()
  app.mount(selector)
}
