import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { InvariantError } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design } from '@keeb-cad/schema'
import { aDesign, aMeta, anId } from '@keeb-cad/schema/testing'
import { THEME_STORAGE_KEY } from '@keeb-cad/ui'
import { workersModule } from '@keeb-cad/workers'
import { describe, expect, it, onTestFinished } from 'vitest'
import { page } from 'vitest/browser'
import { effectScope, type App } from 'vue'

import { editorModule } from './editor-module'
import { mountEditor } from './mount-editor'
import { emulateColorScheme, resetColorScheme } from './testing/color-scheme'

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
    await resetColorScheme()
  })
  const injector = container.resolve(InjectorToken)
  return { mount: () => scope.run(() => mountEditor('#editor-root', injector)) }
}

describe('mountEditor', () => {
  it('applies the stored theme over the OS one before it returns', async () => {
    await emulateColorScheme('dark')
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

  it('throws naming a selector that matches no element', async () => {
    const injector = new Container().resolve(InjectorToken)

    expect(() => mountEditor('#missing', injector)).toThrow(InvariantError)
    expect(() => mountEditor('#missing', injector)).toThrow('#missing')
  })
})
