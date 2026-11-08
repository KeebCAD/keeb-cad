import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'

import { tabsStates } from '../../workbench/states/tabs-states'
import UiTabList from './UiTabList.vue'
import UiTabs from './UiTabs.vue'

describe('Tabs', () => {
  it.each(tabsStates)('renders the $name state as a tab list', async (state) => {
    const screen = await render(UiTabs, { props: state.props, slots: state.slots })

    await expect.element(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('selects a clicked tab and emits its value', async () => {
    const screen = await render(UiTabs, {
      props: { modelValue: 'layout' },
      slots: {
        default: () =>
          h(UiTabList, {
            items: [
              { value: 'layout', label: 'Layout' },
              { value: 'outline', label: 'Outline' },
            ],
          }),
      },
    })
    const outline = screen.getByRole('tab', { name: 'Outline' })

    await outline.click()

    expect(screen.emitted('update:modelValue')).toEqual([['outline']])
    await expect.element(outline).toHaveAttribute('aria-selected', 'true')
  })
})
