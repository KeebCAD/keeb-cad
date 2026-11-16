import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { Option } from '@keeb-cad/result'
import { describe, expect, it, onTestFinished } from 'vitest'
import { render } from 'vitest-browser-vue'
import { type App, defineComponent, h, useTemplateRef } from 'vue'

import { CanvasItems } from './canvas-items'
import { useCanvasItemsRoot } from './use-canvas-items-root'

const CANVAS = { width: 200, height: 100 }

// Draws the canvas's svg and, unless left out, its keys group, and registers them as the canvas
// would.
const Root = defineComponent({
  props: { withKeys: { type: Boolean, required: true } },
  setup(props) {
    const svg = useTemplateRef<SVGSVGElement>('svg')
    const keys = useTemplateRef<SVGGElement>('keys')
    useCanvasItemsRoot(svg, keys)
    return () =>
      h('svg', { ref: 'svg', width: CANVAS.width, height: CANVAS.height }, [
        props.withKeys ? h('g', { ref: 'keys' }) : null,
      ])
  },
})

async function arrange(withKeys: boolean) {
  const container = new Container()
  container.register(CanvasItems).useClass(CanvasItems)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const injector = container.resolve(InjectorToken)
  const screen = await render(Root, {
    props: { withKeys },
    global: { plugins: [{ install: (app: App) => provideInjectorOnApp(app, injector) }] },
  })
  return { items: container.resolve(CanvasItems), screen }
}

describe('useCanvasItemsRoot', () => {
  it('registers the root once both elements are drawn', async () => {
    const { items } = await arrange(true)

    expect(items.size()).toEqual(Option.some(CANVAS))
  })

  it('registers no root while one element is missing', async () => {
    const { items } = await arrange(false)

    expect(items.size()).toEqual(Option.none())
  })

  it('unregisters the root once unmounted', async () => {
    const { items, screen } = await arrange(true)

    screen.unmount()

    expect(items.size()).toEqual(Option.none())
  })
})
