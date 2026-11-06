import { h } from 'vue'

import type { TooltipProps } from '../../src/tooltip/types'
import type { WidgetState } from './types'

export const tooltipStates: readonly WidgetState<TooltipProps>[] = [
  {
    name: 'on a button',
    props: { content: 'Close the panel' },
    slots: { default: () => h('button', { type: 'button' }, 'Close') },
  },
]
