import { angleSchema, deltaSchema } from '@keeb-cad/schema'

import type { OffsetField } from './types'

// In the order the offset declares them. A group's pivot is edited in the group inspector, so a
// selection holding a slot shows none.
export const offsetFields: readonly OffsetField[] = [
  {
    label: 'x',
    text: 'x',
    schema: deltaSchema,
    edit: (x) => ({ position: { x } }),
    groupsOnly: false,
  },
  {
    label: 'y',
    text: 'y',
    schema: deltaSchema,
    edit: (y) => ({ position: { y } }),
    groupsOnly: false,
  },
  {
    label: 'rot',
    text: 'rot',
    schema: angleSchema,
    edit: (rotation) => ({ rotation }),
    groupsOnly: false,
  },
  {
    label: 'pivot x',
    text: 'pivotX',
    schema: deltaSchema,
    edit: (x) => ({ pivot: { x } }),
    groupsOnly: true,
  },
  {
    label: 'pivot y',
    text: 'pivotY',
    schema: deltaSchema,
    edit: (y) => ({ pivot: { y } }),
    groupsOnly: true,
  },
]
