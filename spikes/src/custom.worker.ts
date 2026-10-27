// The custom router (story 9) in its own Web Worker: no tscircuit in this bundle. It only routes:
// the page builds the RoutingInput, so `ms` is routing time. The cap is the router's deadline,
// checked between connections.
import { routeConnections } from './custom-router'
import type { CustomRouteRequest, CustomRouteResponse } from './protocol'

declare const self: DedicatedWorkerGlobalScope

/** Fetched only by the `&probe` negative control, to prove this worker's traffic reaches the block. */
const PROBE_URL = 'https://example.com/'

self.addEventListener('message', (event: MessageEvent<CustomRouteRequest>) => {
  void handle(event.data).then((response) => self.postMessage(response))
})

async function handle({ input, ids, capMs, probe }: CustomRouteRequest): Promise<CustomRouteResponse> {
  const start = performance.now()
  if (probe) {
    let error: string | null = null
    try {
      await fetch(PROBE_URL)
    } catch (err) {
      error = err instanceof Error ? `${err.name}: ${err.message}` : String(err) // expected: the block aborts it
    }
    return { status: 'probed', error, routes: { traces: [], vias: [] }, unrouted: [], ms: performance.now() - start }
  }
  try {
    const { routes, unrouted, timedOut } = routeConnections(input, ids, { deadlineMs: start + capMs, now: () => performance.now() })
    const ms = performance.now() - start
    // Also past the cap when the deadline passed during the last search (nothing left to check).
    if (timedOut || ms > capMs) {
      const error = timedOut
        ? `not done within ${capMs} ms (${unrouted.length} of ${ids.length} connections unrouted when it stopped)`
        : `finished in ${Math.round(ms)} ms, past the ${capMs} ms cap (the last search ran over it)`
      return { status: 'timeout', error, routes, unrouted, ms }
    }
    return { status: 'solved', error: null, routes, unrouted, ms }
  } catch (err) {
    const error = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    return { status: 'failed', error, routes: { traces: [], vias: [] }, unrouted: [...ids], ms: performance.now() - start, thrown: true }
  }
}
