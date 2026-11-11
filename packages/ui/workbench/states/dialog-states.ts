import { h } from 'vue'

import type { WidgetState } from './types'

export const dialogStates: readonly WidgetState[] = [
  {
    name: 'opens from its button',
    props: {},
    slots: {
      title: () => ['Add group in ', h('span', { class: 'font-mono text-mono' }, 'root')],
      default: () => h('p', { class: 'mt-2 text-ui text-text-muted' }, 'The id field goes here.'),
    },
  },
]
