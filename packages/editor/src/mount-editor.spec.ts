import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design } from '@keeb-cad/schema'
import { aDesign, aMeta, anId } from '@keeb-cad/schema/testing'
import { THEME_STORAGE_KEY } from '@keeb-cad/ui'
import { workersModule } from '@keeb-cad/workers'
import { afterEach, describe, expect, it, onTestFinished } from 'vitest'
import { commands, page } from 'vitest/browser'
import { effectScope, type App } from 'vue'

import { editorModule } from './editor-module'
import { mountEditor } from './mount-editor'

afterEach(async () => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  history.replaceState(null, '', location.pathname + location.search)
  await commands.setColorScheme(null)
})

async function arrange(design?: Design) {
  const container = new Container()
    .addModule(designModule)
    .addModule(workersModule)
    .addModule(editorModule)
  await container.autoLoad()
  if (design !== undefined) {
    expectOk(container.resolve(DesignStore).replaceDesign({ design, unreadable: [] }))
  }
  const root = document.createElement('div')
  root.id = 'editor-root'
  document.body.append(root)
  const scope = effectScope()
  onTestFinished(async () => {
    ;(root as HTMLElement & { __vue_app__?: App }).__vue_app__?.unmount()
    scope.stop()
    root.remove()
    history.replaceState(null, '', location.pathname + location.search)
    await container.dispose()
  })
  const injector = container.resolve(InjectorToken)
  return { mount: () => scope.run(() => mountEditor('#editor-root', injector)) }
}

describe('mountEditor', () => {
  it('applies the stored theme over the OS one before it returns', async () => {
    await commands.setColorScheme('dark')
    // The emulated scheme reaches the test frame's media queries a moment later.
    await expect.poll(() => matchMedia('(prefers-color-scheme: dark)').matches).toBe(true)
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    const { mount } = await arrange()

    mount()

    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it("provides the container, so the shell's top bar shows its store's design", async () => {
    history.replaceState(null, '', '#/design/lily-58/layout')
    const { mount } = await arrange(
      aDesign({ meta: aMeta({ id: anId('lily-58'), name: 'Lily58' }) }),
    )

    mount()

    await expect
      .element(page.getByRole('banner', { name: 'Top bar' }).getByRole('heading', { level: 1 }))
      .toHaveTextContent('Lily58')
  })
})
