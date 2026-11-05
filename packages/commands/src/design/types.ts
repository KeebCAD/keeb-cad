import type * as v from 'valibot'

import type { newDesignInputSchema } from './new-design-input-schema'

export type NewDesignInput = v.InferOutput<typeof newDesignInputSchema>
