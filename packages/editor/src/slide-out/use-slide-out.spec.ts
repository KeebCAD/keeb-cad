import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { Landmarks } from '../landmarks/landmarks'
import { SlideOut } from './slide-out'
import { useSlideOut } from './use-slide-out'

function button(name: string, parent: HTMLElement = document.body): HTMLButtonElement {
  const element = document.createElement('button')
  element.type = 'button'
  element.textContent = name
  parent.append(element)
  onTestFinished(() => {
    element.remove()
  })
  return element
}

// The rail button opens the slide-out, so it is the invoker; the slide-out holds a field.
function arrange() {
  const container = new Container()
  container.register(Landmarks).useClass(Landmarks)
  container.register(SlideOut).useClass(SlideOut)
  onTestFinished(() => container.dispose())
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  const canvas = document.createElement('main')
  canvas.tabIndex = -1
  document.body.append(canvas)
  container.resolve(Landmarks).register('canvas', canvas)
  const slideOutRoot = document.createElement('aside')
  document.body.append(slideOutRoot)
  onTestFinished(() => {
    canvas.remove()
    slideOutRoot.remove()
  })
  const invoker = button('Tree')
  invoker.focus()
  container.resolve(SlideOut).open()
  return {
    slideOut: app.runWithContext(() => useSlideOut()),
    canvas,
    invoker,
    slideOutRoot,
    inside: button('Inside', slideOutRoot),
  }
}

describe('useSlideOut', () => {
  it('returns focus to the invoker from inside the slide-out', () => {
    const { slideOut, invoker, slideOutRoot, inside } = arrange()
    inside.focus()

    slideOut.returnFocus(slideOutRoot)

    expect(document.activeElement).toBe(invoker)
  })

  it('leaves focus the user moved outside the slide-out where it is', () => {
    const { slideOut, slideOutRoot } = arrange()
    const outside = button('Outside')
    outside.focus()

    slideOut.returnFocus(slideOutRoot)

    expect(document.activeElement).toBe(outside)
  })

  it('focuses the canvas landmark when the invoker is gone', () => {
    const { slideOut, canvas, invoker, slideOutRoot, inside } = arrange()
    invoker.remove()
    inside.focus()

    slideOut.returnFocus(slideOutRoot)

    expect(document.activeElement).toBe(canvas)
  })
})
