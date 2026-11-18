import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { describe, expect, it, onTestFinished } from 'vitest'
import { render } from 'vitest-browser-vue'
import { type App, defineComponent, h, shallowRef } from 'vue'

import type { LandmarkName } from './types'
import { useFocusLandmark } from './use-focus-landmark'
import { useLandmark } from './use-landmark'
import { Landmarks } from './landmarks'

// The canvas landmark, and a button that moves focus to the landmark it names.
function host(target: LandmarkName) {
  return defineComponent({
    setup() {
      const root = shallowRef<HTMLElement | null>(null)
      useLandmark('canvas', root)
      const focusLandmark = useFocusLandmark()
      return () => [
        h('main', { ref: root, tabindex: -1, 'aria-label': 'Canvas' }),
        h('button', { type: 'button', onClick: () => focusLandmark(target) }, 'Leave'),
      ]
    },
  })
}

// From script, so the click moves no focus of its own.
function clickLeave(button: Element) {
  if (!(button instanceof HTMLButtonElement)) throw new TypeError('Leave is no button.')
  button.click()
}

async function arrange(target: LandmarkName) {
  const container = new Container()
  container.register(Landmarks).useClass(Landmarks)
  onTestFinished(() => container.dispose())
  const injector = container.resolve(InjectorToken)
  return render(host(target), {
    global: { plugins: [{ install: (app: App) => provideInjectorOnApp(app, injector) }] },
  })
}

describe('useFocusLandmark', () => {
  it("focuses the named landmark's root", async () => {
    const screen = await arrange('canvas')

    clickLeave(screen.getByRole('button', { name: 'Leave' }).element())

    await expect.element(screen.getByRole('main', { name: 'Canvas' })).toHaveFocus()
  })

  it('leaves focus where it is when the named landmark is not mounted', async () => {
    const screen = await arrange('inspector')
    const canvas = screen.getByRole('main', { name: 'Canvas' })
    canvas.element().focus()

    clickLeave(screen.getByRole('button', { name: 'Leave' }).element())

    await expect.element(canvas).toHaveFocus()
  })
})
