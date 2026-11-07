import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design } from '@keeb-cad/schema'
import { aDesign, aMeta, anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { App } from 'vue'

import DesignCanvas from './DesignCanvas.vue'

async function arrange(design?: Design) {
  const container = new Container().addModule(designModule)
  await container.autoLoad()
  if (design !== undefined) {
    expectOk(container.resolve(DesignStore).replaceDesign({ design, unreadable: [] }))
  }
  const injector = container.resolve(InjectorToken)
  return render(DesignCanvas, {
    global: { plugins: [{ install: (app: App) => provideInjectorOnApp(app, injector) }] },
  })
}

describe('DesignCanvas', () => {
  it('shows nothing while no design is committed', async () => {
    const screen = await arrange()

    expect(screen.container).toBeEmptyDOMElement()
  })

  it("shows the committed design's name and id", async () => {
    const screen = await arrange(aDesign({ meta: aMeta({ id: anId('lily-58'), name: 'Lily58' }) }))

    await expect.element(screen.getByText('Lily58', { exact: true })).toBeVisible()
    await expect.element(screen.getByText('lily-58', { exact: true })).toBeVisible()
  })
})
