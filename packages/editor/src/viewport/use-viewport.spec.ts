import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign } from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp, shallowRef } from 'vue'

import { CanvasItems } from './canvas-items'
import type { Bounds } from './types'
import { useViewport } from './use-viewport'
import { Viewport } from './viewport'

const SIZE = { width: 200, height: 100 }
const FIRST: Bounds = { x: -9, y: -9, width: 18, height: 18 }
const SECOND: Bounds = { x: 91, y: 91, width: 18, height: 18 }
// 100 px less 2 × 24 px of padding over the 18 mm key, centred on it.
const FIRST_FITTED = { centre: { x: 0, y: 0 }, zoom: 52 / 18 }

async function arrange() {
  localStorage.clear()
  const container = new Container().addModule(designModule)
  container.register(CanvasItems).useClass(CanvasItems)
  container.register(Viewport).useClass(Viewport)
  onTestFinished(async () => {
    await container.dispose()
    localStorage.clear()
  })
  await container.autoLoad()
  // A design is open, so a fit is the open design's own value.
  expectOk(container.resolve(DesignStore).replaceDesign({ design: aDesign(), unreadable: [] }))
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  const viewport = container.resolve(Viewport)
  return { viewport, view: app.runWithContext(() => useViewport(shallowRef(SIZE))) }
}

describe('useViewport', () => {
  it('maps a model point to the screen, y flipped', async () => {
    const { viewport, view } = await arrange()
    viewport.setZoom(1)

    expect(view.modelToScreen({ x: 10, y: 10 })).toEqual({ x: 110, y: 40 })
  })

  it('fits the view on the first call only', async () => {
    const { viewport, view } = await arrange()

    view.fitOnce(FIRST)
    view.fitOnce(SECOND)

    expect(viewport.value).toEqual(FIRST_FITTED)
  })
})
