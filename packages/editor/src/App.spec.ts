import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign } from '@keeb-cad/schema/testing'
import { describe, it, expect, onTestFinished } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { App as VueApp } from 'vue'

import App from './App.vue'
import { createEditorRouter } from './router'

describe('App', () => {
  it('renders the editor shell', async () => {
    const container = new Container().addModule(designModule)
    await container.autoLoad()
    expectOk(container.resolve(DesignStore).replaceDesign({ design: aDesign(), unreadable: [] }))
    const injector = container.resolve(InjectorToken)
    const router = createEditorRouter()
    onTestFinished(() => {
      router.listening = false
    })
    await router.push('/')

    const screen = await render(App, {
      global: {
        plugins: [router, { install: (app: VueApp) => provideInjectorOnApp(app, injector) }],
      },
    })

    await expect.element(screen.getByRole('main')).toBeVisible()
    await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent('keeb-cad')
  })
})
