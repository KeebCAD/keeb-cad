import { h } from 'vue'

import UiKbd from '../../src/kbd/UiKbd.vue'
import UiTabList from '../../src/tabs/UiTabList.vue'
import UiTabPanel from '../../src/tabs/UiTabPanel.vue'
import type { WidgetState } from './types'

const items = [
  { value: 'layout', label: 'Layout', hotkey: '1' },
  { value: 'outline', label: 'Outline', hotkey: '2' },
]

export const tabsStates: readonly WidgetState<{ modelValue?: string }>[] = [
  {
    name: 'a list and a panel per tab, the first active',
    props: { modelValue: 'layout' },
    slots: {
      default: () => [
        h(UiTabList, { items }),
        h(UiTabPanel, { value: 'layout' }, () => 'Layout panel'),
        h(UiTabPanel, { value: 'outline' }, () => 'Outline panel'),
      ],
    },
  },
  {
    name: 'a list with hints',
    props: { modelValue: 'layout' },
    slots: {
      default: () =>
        h(
          UiTabList,
          { items },
          {
            hint: ({ item }: { item: (typeof items)[number] }) => h(UiKbd, { hotkey: item.hotkey }),
          },
        ),
    },
  },
  { name: 'no tabs', props: {}, slots: { default: () => h(UiTabList, { items: [] }) } },
]
