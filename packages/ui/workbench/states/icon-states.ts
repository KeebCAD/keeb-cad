import type { IconProps } from '../../src/icon/types'
import type { WidgetState } from './types'

export const iconStates: readonly WidgetState<IconProps>[] = [
  { name: 'decorative', props: { name: 'close' } },
  { name: 'labelled', props: { name: 'close', label: 'Close' } },
]
