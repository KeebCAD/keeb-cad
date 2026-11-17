import type * as v from 'valibot'

import type { setParameterInputSchema } from './set-parameter-input-schema'

export type SetParameterInput = v.InferOutput<typeof setParameterInputSchema>
