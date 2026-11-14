import type * as v from 'valibot'

import type { setOverrideInputSchema } from './set-override-input-schema'

export type SetOverrideInput = v.InferOutput<typeof setOverrideInputSchema>
