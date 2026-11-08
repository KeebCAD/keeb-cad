import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'

import type { TabItem } from './types'
import UiTabList from './UiTabList.vue'
import UiTabs from './UiTabs.vue'

function arrange(items: readonly TabItem[], hint?: (item: TabItem) => string) {
  return render(UiTabs, {
    props: { modelValue: 'layout' },
    slots: {
      default: () =>
        h(
          UiTabList,
          { items },
          hint === undefined ? {} : { hint: ({ item }: { item: TabItem }) => hint(item) },
        ),
    },
  })
}

describe('TabList', () => {
  it('renders a tab per item, in order, each named by its label', async () => {
    const screen = await arrange([
      { value: 'layout', label: 'Layout' },
      { value: 'outline', label: 'Outline' },
    ])

    expect(
      screen
        .getByRole('tab')
        .elements()
        .map((tab) => tab.textContent.trim()),
    ).toEqual(['Layout', 'Outline'])
  })

  it('renders an empty tab list for no items', async () => {
    const screen = await arrange([])

    await expect.element(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('tab').elements()).toEqual([])
  })

  it("shows each item's hint inside its tab, leaving the tab named by its label alone", async () => {
    const screen = await arrange([{ value: 'pcb', label: 'PCB' }], () => '3')

    const tab = screen.getByRole('tab', { name: 'PCB', exact: true })
    await expect.element(tab).toBeVisible()
    await expect.element(tab.getByText('3', { exact: true })).toBeVisible()
  })
})
