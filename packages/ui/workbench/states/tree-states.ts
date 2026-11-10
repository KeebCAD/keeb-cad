import type { TreeProps } from '../../src/tree/types'
import type { WidgetState } from './types'

const rows: TreeProps['rows'] = [
  {
    id: 'outer',
    label: 'outer',
    kind: 'group',
    children: [
      { id: 'outer-bottom', label: 'outer-bottom', kind: 'slot', children: [] },
      { id: 'outer-home', label: 'outer-home', kind: 'slot', children: [] },
    ],
  },
  { id: 'thumb', label: 'thumb', kind: 'slot', children: [] },
]

export const treeStates: readonly WidgetState<TreeProps & { selected: readonly string[] }>[] = [
  { name: 'nothing selected', props: { label: 'Tree', rows, selected: [] } },
  { name: 'a slot selected', props: { label: 'Tree', rows, selected: ['outer-home'] } },
  { name: 'no rows', props: { label: 'Tree', rows: [], selected: [] } },
]
