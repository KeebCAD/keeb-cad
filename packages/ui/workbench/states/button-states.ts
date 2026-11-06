import type { ButtonProps } from '../../src/button/types'
import type { WidgetState } from './types'

export const buttonStates: readonly WidgetState<ButtonProps>[] = [
  { name: 'enabled', props: {}, slots: { default: () => 'Export' } },
  {
    name: 'disabled with a reason',
    props: { disabledReason: 'Nothing to export yet' },
    slots: { default: () => 'Export' },
  },
]
