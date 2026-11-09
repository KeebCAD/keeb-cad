import type { LaneFailed } from '../lane/types'

export interface EngineUnavailable {
  kind: 'engine-unavailable'
}

export type EscapedFromEngine = { kind: 'raw-exception' } | { kind: 'thrown'; error: unknown }

export interface ClassifiedEscape {
  failure: LaneFailed
  vmDead: boolean
}
