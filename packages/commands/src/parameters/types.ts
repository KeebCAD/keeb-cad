import type * as v from 'valibot'

import type { addParameterInputSchema } from './add-parameter-input-schema'
import type { deleteParameterInputSchema } from './delete-parameter-input-schema'
import type { renameParameterInputSchema } from './rename-parameter-input-schema'
import type { setParameterInputSchema } from './set-parameter-input-schema'

export type AddParameterInput = v.InferOutput<typeof addParameterInputSchema>
export type SetParameterInput = v.InferOutput<typeof setParameterInputSchema>
export type RenameParameterInput = v.InferOutput<typeof renameParameterInputSchema>
export type DeleteParameterInput = v.InferOutput<typeof deleteParameterInputSchema>
