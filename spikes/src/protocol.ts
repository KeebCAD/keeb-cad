import type { SimpleRouteJson, SimplifiedPcbTraces } from '@tscircuit/capacity-autorouter'

/** Main thread → worker. */
export interface RouteRequest {
  board: SimpleRouteJson
  /** Negative control: make the worker fetch an external URL instead of routing. */
  probe: boolean
}

/** Worker → main thread. */
export type RouteResponse =
  | { status: 'solved'; error: null; traces: SimplifiedPcbTraces; ms: number }
  | { status: 'failed'; error: string; traces: SimplifiedPcbTraces; ms: number }
  | { status: 'probed'; error: string | null; traces: []; ms: number }
