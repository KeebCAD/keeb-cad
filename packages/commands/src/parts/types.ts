import type * as v from 'valibot'

import type { deletePartInputSchema } from './delete-part-input-schema'

export type DeletePartInput = v.InferOutput<typeof deletePartInputSchema>
