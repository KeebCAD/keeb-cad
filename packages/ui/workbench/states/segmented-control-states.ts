import type { SegmentedControlProps } from '../../src/segmented-control/types'
import type { WidgetState } from './types'

export const segmentedControlStates: readonly WidgetState<
  SegmentedControlProps & { modelValue: string }
>[] = [
  {
    name: 'first checked',
    props: {
      label: 'Axis',
      options: [
        { value: 'y', label: 'Column ↑' },
        { value: 'x', label: 'Row →' },
      ],
      modelValue: 'y',
    },
  },
]
