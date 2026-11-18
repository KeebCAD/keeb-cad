import type * as v from 'valibot'

import type { addGroupInputSchema } from './add-group-input-schema'
import type { addSlotInputSchema } from './add-slot-input-schema'
import type { deleteNodeInputSchema } from './delete-node-input-schema'
import type { duplicateNodeInputSchema } from './duplicate-node-input-schema'
import type { setAnchorInputSchema } from './set-anchor-input-schema'
import type { setArrangementInputSchema } from './set-arrangement-input-schema'
import type { setGapInputSchema } from './set-gap-input-schema'
import type { setOffsetInputSchema } from './set-offset-input-schema'

export type AddSlotInput = v.InferOutput<typeof addSlotInputSchema>
export type AddGroupInput = v.InferOutput<typeof addGroupInputSchema>
export type DuplicateNodeInput = v.InferOutput<typeof duplicateNodeInputSchema>
export type DeleteNodeInput = v.InferOutput<typeof deleteNodeInputSchema>
export type SetAnchorInput = v.InferOutput<typeof setAnchorInputSchema>
export type SetGapInput = v.InferOutput<typeof setGapInputSchema>
export type SetOffsetInput = v.InferOutput<typeof setOffsetInputSchema>
export type SetArrangementInput = v.InferOutput<typeof setArrangementInputSchema>
