import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { InvariantError, Option } from '@keeb-cad/result'
import { describe, expect, it, onTestFinished } from 'vitest'
import { render } from 'vitest-browser-vue'
import { type App, type Component, defineComponent, h, shallowRef } from 'vue'

import { Landmarks } from './landmarks'
import { useLandmark } from './use-landmark'

const Inspector = defineComponent({
  setup() {
    const root = shallowRef<HTMLElement | null>(null)
    useLandmark('inspector', root)
    return () => h('section', { ref: root, 'aria-label': 'Inspector' })
  },
})

const Rootless = defineComponent({
  setup() {
    useLandmark('inspector', shallowRef<HTMLElement | null>(null))
    return () => null
  },
})

async function arrange(component: Component) {
  const container = new Container()
  container.register(Landmarks).useClass(Landmarks)
  onTestFinished(() => container.dispose())
  const injector = container.resolve(InjectorToken)
  const screen = await render(component, {
    global: { plugins: [{ install: (app: App) => provideInjectorOnApp(app, injector) }] },
  })
  return { screen, landmarks: container.resolve(Landmarks) }
}

describe('useLandmark', () => {
  it('registers its root for its place once mounted', async () => {
    const { screen, landmarks } = await arrange(Inspector)

    const root = screen.getByRole('region', { name: 'Inspector' }).element()

    expect(landmarks.root('inspector')).toEqual(Option.some(root))
  })

  it('unregisters its root once unmounted', async () => {
    const { screen, landmarks } = await arrange(Inspector)

    screen.unmount()

    expect(landmarks.root('inspector')).toEqual(Option.none())
  })

  it('throws an InvariantError when mounted with no root', async () => {
    const mounting = arrange(Rootless)

    await expect(mounting).rejects.toEqual(
      new InvariantError('The inspector rendered no root element.'),
    )
  })
})
