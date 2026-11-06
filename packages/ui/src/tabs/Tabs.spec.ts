import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'

import { tabsStates } from '../../workbench/states/tabs-states'
import UiTabs from './UiTabs.vue'

const ITEMS = [
  { value: 'layout', label: 'Layout' },
  { value: 'outline', label: 'Outline' },
]

describe('Tabs', () => {
  it.each(tabsStates)(
    'renders the $name state with a tab per item, named by its label',
    async (state) => {
      const screen = await render(UiTabs, { props: state.props, slots: state.slots })

      await expect.element(screen.getByRole('tablist')).toBeInTheDocument()
      expect(
        screen
          .getByRole('tab')
          .elements()
          .map((tab) => tab.textContent?.trim()),
      ).toEqual(state.props.items.map(({ label }) => label))
    },
  )

  it('selects a clicked tab and emits its value', async () => {
    const screen = await render(UiTabs, { props: { items: ITEMS, modelValue: 'layout' } })
    const outline = screen.getByRole('tab', { name: 'Outline' })

    await outline.click()

    expect(screen.emitted('update:modelValue')).toEqual([['outline']])
    await expect.element(outline).toHaveAttribute('aria-selected', 'true')
  })

  it('renders an empty tab list for no items', async () => {
    const screen = await render(UiTabs, { props: { items: [] } })

    await expect.element(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('tab').elements()).toEqual([])
  })
})
