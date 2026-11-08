import { expect } from 'vitest'
import { commands } from 'vitest/browser'

import type { ColorScheme } from './types'

export async function emulateColorScheme(scheme: ColorScheme): Promise<void> {
  await commands.setColorScheme(scheme)
  // The emulated scheme reaches the test frame's media queries a moment later.
  await expect
    .poll(() => matchMedia('(prefers-color-scheme: dark)').matches)
    .toBe(scheme === 'dark')
}

// The emulated scheme stays on the browser page, so it goes back to the browser's own.
export async function resetColorScheme(): Promise<void> {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  await commands.setColorScheme(null)
}
