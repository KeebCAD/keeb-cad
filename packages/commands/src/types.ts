import type * as v from 'valibot'

import type { emptyInputSchema } from './empty-input-schema'

export type EmptyInput = v.InferOutput<typeof emptyInputSchema>
