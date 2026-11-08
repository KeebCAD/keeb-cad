import type { RailButtonProps } from '../../src/rail-button/types'
import type { WidgetState } from './types'

export const railButtonStates: readonly WidgetState<RailButtonProps>[] = [
  { name: 'collapsed', props: { icon: 'tree', label: 'Tree', expanded: false } },
  { name: 'expanded', props: { icon: 'tree', label: 'Tree', expanded: true } },
]
