import { designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { CanvasItems } from '../viewport/canvas-items'
import { Viewport } from '../viewport/viewport'
import { zoomForPercent } from '../viewport/zoom-percent'
import { useZoomReadout } from './use-zoom-readout'

const PERCENT = 200

async function arrange(zoom: number) {
  const container = new Container().addModule(designModule)
  container.register(CanvasItems).useClass(CanvasItems)
  container.register(Viewport).useClass(Viewport)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  container.resolve(Viewport).setZoom(zoom)
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  return { app }
}

describe('useZoomReadout', () => {
  it("reads the viewport's zoom as a percent", async () => {
    const { app } = await arrange(zoomForPercent(PERCENT))

    const readout = app.runWithContext(() => useZoomReadout())

    expect(readout.value).toBe('200%')
  })
})
