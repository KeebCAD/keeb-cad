import { designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { CanvasCursor } from '../viewport/canvas-cursor'
import { CanvasItems } from '../viewport/canvas-items'
import type { Point } from '../viewport/types'
import { Viewport } from '../viewport/viewport'
import { useCursorReadout } from './use-cursor-readout'

const SIZE = { width: 200, height: 100 }
const CANVAS_CENTRE = { x: 100, y: 50 }

async function arrange() {
  const container = new Container().addModule(designModule)
  container.register(CanvasItems).useClass(CanvasItems)
  container.register(Viewport).useClass(Viewport)
  container.register(CanvasCursor).useClass(CanvasCursor)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  // The viewport centred on the model point, so the pointer at the canvas centre reads it.
  const pointAt = (model: Point) => {
    container.resolve(Viewport).setCentre(model)
    container.resolve(CanvasCursor).point(CANVAS_CENTRE, SIZE)
  }
  return { app, pointAt }
}

describe('useCursorReadout', () => {
  it('reads dashes while the pointer is off the canvas', async () => {
    const { app } = await arrange()

    const readout = app.runWithContext(() => useCursorReadout())

    expect(readout.value).toBe('x – y –')
  })

  it('reads the model point under the pointer, a negative with a minus sign', async () => {
    const { app, pointAt } = await arrange()
    const readout = app.runWithContext(() => useCursorReadout())

    pointAt({ x: 12.34, y: -5.67 })

    expect(readout.value).toBe('x 12.34 y −5.67')
  })
})
