import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'

import { canvasToggleStates } from '../../workbench/states/canvas-toggle-states'
import type { CanvasToggleProps } from './types'
import UiCanvasToggle from './UiCanvasToggle.vue'

const SVG = 'http://www.w3.org/2000/svg'

async function arrange(props: CanvasToggleProps) {
  const presses: string[] = []
  const screen = await render({
    render: () =>
      h('svg', { viewBox: '-12 -12 24 24', width: 96, height: 96 }, [
        h(UiCanvasToggle, { ...props, onPress: () => presses.push('press') }, () =>
          h('rect', { x: -9, y: -9, width: 18, height: 18 }),
        ),
      ]),
  })
  return { screen, presses, button: () => screen.getByRole('button', { name: props.label }) }
}

describe('CanvasToggle', () => {
  it.each(canvasToggleStates)(
    'renders the $name state as a button named by its label',
    async (state) => {
      const { button } = await arrange(state.props)

      await expect.element(button()).toBeVisible()
    },
  )

  it('renders an SVG g that emits press on a click and stays aria-pressed false while its parent keeps it unpressed', async () => {
    const { button, presses } = await arrange({ label: 'a', pressed: false })

    await button().click()

    const element = button().element()
    expect({
      tag: element.localName,
      namespace: element.namespaceURI,
      pressed: element.getAttribute('aria-pressed'),
      presses,
    }).toEqual({ tag: 'g', namespace: SVG, pressed: 'false', presses: ['press'] })
  })

  it('emits press on a click while pressed and stays pressed', async () => {
    const { button, presses } = await arrange({ label: 'a', pressed: true })

    await button().click()

    expect({ pressed: button().element().getAttribute('aria-pressed'), presses }).toEqual({
      pressed: 'true',
      presses: ['press'],
    })
  })
})
