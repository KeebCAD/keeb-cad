import type { SimpleRouteJson, SimplifiedPcbTraces } from '@tscircuit/capacity-autorouter'

/** Main thread → worker. */
export interface RouteRequest {
  board: SimpleRouteJson
  /** Negative control: make the worker fetch an external URL instead of routing. */
  probe: boolean
  /** Solve-time cap in ms, checked between solver steps; omitted, the solver runs to its end. */
  capMs?: number
}

/**
 * Worker → main thread. `ms` is solve time inside the worker. `traces` is whatever tscircuit
 * returns, also on failure and timeout (empty when it has none or its output throws).
 */
export type RouteResponse =
  | { status: 'solved'; error: null; traces: SimplifiedPcbTraces; ms: number }
  /** `thrown`: tscircuit threw, rather than finishing with `failed` set. */
  | { status: 'failed'; error: string; traces: SimplifiedPcbTraces; ms: number; thrown: boolean }
  | { status: 'timeout'; error: string; traces: SimplifiedPcbTraces; ms: number }
  | { status: 'probed'; error: string | null; traces: []; ms: number }
