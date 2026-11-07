import type { DesignInvalid, Emptied } from '@keeb-cad/schema'
import type { LoadFailure, SaveError } from '@keeb-cad/storage'
import type * as v from 'valibot'

import type { openStoredDesignInputSchema } from './open-stored-design-input-schema'

export interface LoadOutcome {
  emptied: Emptied[]
}

export type LoadFlowError = LoadFailure | SaveError | DesignInvalid

export type OpenStoredDesignInput = v.InferOutput<typeof openStoredDesignInputSchema>
