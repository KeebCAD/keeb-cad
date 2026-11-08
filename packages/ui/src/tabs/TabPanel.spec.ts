import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, ref } from 'vue'

import UiTabList from './UiTabList.vue'
import UiTabPanel from './UiTabPanel.vue'
import UiTabs from './UiTabs.vue'

// One panel whose value follows the selected tab, with the list and the panel in separate
// containers, as a shell lays them out.
const FollowingPanel = defineComponent({
  setup() {
    const selected = ref('layout')
    return () =>
      h(
        UiTabs,
        {
          modelValue: selected.value,
          'onUpdate:modelValue': (value: string | undefined) => {
            if (value !== undefined) selected.value = value
          },
        },
        () => [
          h('div', [
            h(UiTabList, {
              items: [
                { value: 'layout', label: 'Layout' },
                { value: 'outline', label: 'Outline' },
              ],
            }),
          ]),
          h('div', [h(UiTabPanel, { value: selected.value }, () => 'Shared panel')]),
        ],
      )
  },
})

describe('TabPanel', () => {
  it('is controlled by the selected tab and labelled by it, apart from the list', async () => {
    const screen = await render(FollowingPanel)
    const tab = screen.getByRole('tab', { name: 'Layout' }).element()
    const panel = screen.getByRole('tabpanel').element()

    expect({
      controls: tab.getAttribute('aria-controls'),
      labelledBy: panel.getAttribute('aria-labelledby'),
    }).toEqual({ controls: panel.id, labelledBy: tab.id })
  })

  it('is controlled by a tab selected after it mounted, following its value', async () => {
    const screen = await render(FollowingPanel)
    const outline = screen.getByRole('tab', { name: 'Outline' })

    await outline.click()

    const panel = screen.getByRole('tabpanel')
    await expect.element(panel).toHaveAttribute('aria-labelledby', outline.element().id)
    await expect.element(outline).toHaveAttribute('aria-controls', panel.element().id)
  })
})
