import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'

import { railButtonStates } from '../../workbench/states/rail-button-states'
import { cssRgb } from '../testing/css-rgb'
import '../theme/theme.css'
import UiRailButton from './UiRailButton.vue'

describe('RailButton', () => {
  it.each(railButtonStates)('renders the $name state as a button named Tree', async (state) => {
    const screen = await render(UiRailButton, { props: state.props })

    await expect.element(screen.getByRole('button', { name: 'Tree' })).toBeVisible()
  })

  it.each([
    [true, 'true'],
    [false, 'false'],
  ])('given expanded %s, says aria-expanded %s', async (expanded, expected) => {
    const screen = await render(UiRailButton, { props: { icon: 'tree', label: 'Tree', expanded } })

    await expect
      .element(screen.getByRole('button', { name: 'Tree' }))
      .toHaveAttribute('aria-expanded', expected)
  })

  it.each([
    ['dark', '#51576d', '#ca9ee6'],
    ['light', '#dce0e8', '#8839ef'],
  ])(
    'expanded under the %s theme fills with fill-on and edges its left in selection',
    async (theme, background, edge) => {
      const screen = await render({
        render: () =>
          h(
            'div',
            { 'data-theme': theme },
            h(UiRailButton, { icon: 'tree', label: 'Tree', expanded: true }),
          ),
      })

      const style = getComputedStyle(screen.getByRole('button').element())
      expect({ background: style.backgroundColor, edge: style.borderLeftColor }).toEqual({
        background: cssRgb(background),
        edge: cssRgb(edge),
      })
    },
  )

  it('emits click', async () => {
    const screen = await render(UiRailButton, {
      props: { icon: 'tree', label: 'Tree', expanded: false },
    })

    await screen.getByRole('button', { name: 'Tree' }).click()

    expect(screen.emitted('click')).toHaveLength(1)
  })
})
