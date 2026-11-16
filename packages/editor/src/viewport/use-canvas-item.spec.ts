import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { Option } from '@keeb-cad/result'
import { aPlacementId } from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished } from 'vitest'
import { render } from 'vitest-browser-vue'
import { type App, defineComponent, h, useTemplateRef } from 'vue'

import { CanvasItems } from './canvas-items'
import { useCanvasItem } from './use-canvas-item'

const SVG = 'http://www.w3.org/2000/svg'
const ID = aPlacementId('left/a')
const OTHER = aPlacementId('left/b')
const KEY_MM = 18

// Draws key a's rect, or none, and registers it as the canvas would.
const Key = defineComponent({
  props: { drawn: { type: Boolean, required: true } },
  setup(props) {
    const element = useTemplateRef<SVGRectElement>('element')
    useCanvasItem(ID, element)
    return () =>
      h('svg', [props.drawn ? h('rect', { ref: 'element', width: KEY_MM, height: KEY_MM }) : null])
  },
})

// The registered root, mounted outside the key's component so it outlives it.
function mountRoot(items: CanvasItems): void {
  const svg = document.createElementNS(SVG, 'svg')
  const keys = document.createElementNS(SVG, 'g')
  svg.append(keys)
  document.body.append(svg)
  onTestFinished(() => svg.remove())
  items.registerRoot({ svg, keys })
}

async function arrange(drawn: boolean) {
  const container = new Container()
  container.register(CanvasItems).useClass(CanvasItems)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const items = container.resolve(CanvasItems)
  mountRoot(items)
  const injector = container.resolve(InjectorToken)
  const screen = await render(Key, {
    props: { drawn },
    global: { plugins: [{ install: (app: App) => provideInjectorOnApp(app, injector) }] },
  })
  return { items, screen }
}

describe('useCanvasItem', () => {
  it('registers an SVG element under its id', async () => {
    const { items } = await arrange(true)

    expect({ own: items.bounds([ID]), other: items.bounds([OTHER]) }).toEqual({
      own: Option.some({
        x: expect.any(Number),
        y: expect.any(Number),
        width: KEY_MM,
        height: KEY_MM,
      }),
      other: Option.none(),
    })
  })

  it('registers nothing for no element', async () => {
    const { items } = await arrange(false)

    expect(items.drawsAny).toBe(false)
  })

  it('unregisters the element once unmounted', async () => {
    const { items, screen } = await arrange(true)

    screen.unmount()

    expect(items.drawsAny).toBe(false)
  })
})
