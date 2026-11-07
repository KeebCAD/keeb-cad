import type { DesignInvalid, Emptied } from '@keeb-cad/schema'
import type { LoadFailure, SaveError } from '@keeb-cad/storage'

export interface LoadOutcome {
  emptied: Emptied[]
}

export type LoadFlowError = LoadFailure | SaveError | DesignInvalid
