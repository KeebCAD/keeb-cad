import { createApp } from 'vue'

import UiWorkbench from './UiWorkbench.vue'
import type { ThemeName } from './types'
import './workbench.css'

const THEMES: readonly string[] = ['dark', 'light'] satisfies ThemeName[]

export function mountWorkbench(selector: string): void {
  const theme = new URLSearchParams(location.search).get('theme')
  if (theme !== null && THEMES.includes(theme)) document.documentElement.dataset.theme = theme
  createApp(UiWorkbench).mount(selector)
}
