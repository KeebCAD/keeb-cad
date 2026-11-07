import { THEME_STORAGE_KEY } from '@keeb-cad/ui'
import { afterEach, describe, expect, it, onTestFinished } from 'vitest'
import { commands } from 'vitest/browser'
import { effectScope, type App } from 'vue'

import { mountEditor } from './mount-editor'

afterEach(async () => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  await commands.setColorScheme(null)
})

describe('mountEditor', () => {
  it('applies the stored theme over the OS one before it returns', async () => {
    await commands.setColorScheme('dark')
    // The emulated scheme reaches the test frame's media queries a moment later.
    await expect.poll(() => matchMedia('(prefers-color-scheme: dark)').matches).toBe(true)
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    const root = document.createElement('div')
    root.id = 'editor-root'
    document.body.append(root)
    const scope = effectScope()
    onTestFinished(() => {
      ;(root as HTMLElement & { __vue_app__?: App }).__vue_app__?.unmount()
      scope.stop()
      root.remove()
    })

    scope.run(() => mountEditor('#editor-root'))

    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
