import type { TabsProps } from '../../src/tabs/types'
import type { WidgetState } from './types'

export const tabsStates: readonly WidgetState<TabsProps & { modelValue?: string }>[] = [
  {
    name: 'two tabs, the first active',
    props: {
      items: [
        { value: 'layout', label: 'Layout' },
        { value: 'outline', label: 'Outline' },
      ],
      modelValue: 'layout',
    },
    slots: { layout: () => 'Layout panel', outline: () => 'Outline panel' },
  },
  { name: 'no tabs', props: { items: [] } },
]
