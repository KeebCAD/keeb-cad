import type * as v from 'valibot'

import type { emptyInputSchema } from './empty-input-schema'
import type { deletePartInputSchema } from './parts/delete-part-input-schema'

export type EmptyInput = v.InferOutput<typeof emptyInputSchema>
export type DeletePartInput = v.InferOutput<typeof deletePartInputSchema>
