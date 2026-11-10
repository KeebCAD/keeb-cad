import type * as v from 'valibot'

import type { addGroupInputSchema } from './add-group-input-schema'
import type { addSlotInputSchema } from './add-slot-input-schema'
import type { deleteNodeInputSchema } from './delete-node-input-schema'
import type { duplicateNodeInputSchema } from './duplicate-node-input-schema'

export type AddSlotInput = v.InferOutput<typeof addSlotInputSchema>
export type AddGroupInput = v.InferOutput<typeof addGroupInputSchema>
export type DuplicateNodeInput = v.InferOutput<typeof duplicateNodeInputSchema>
export type DeleteNodeInput = v.InferOutput<typeof deleteNodeInputSchema>
