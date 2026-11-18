import type { SegmentedControlProps } from '../../src/segmented-control/types'
import type { WidgetState } from './types'

const AXES = [
  { value: 'y', label: 'Column ↑' },
  { value: 'x', label: 'Row →' },
]

export const segmentedControlStates: readonly WidgetState<
  SegmentedControlProps & { modelValue: string }
>[] = [
  { name: 'first checked', props: { label: 'Axis', options: AXES, modelValue: 'y' } },
  // A value no option holds, as for a selection whose nodes differ.
  { name: 'none checked', props: { label: 'Axis', options: AXES, modelValue: '' } },
]
