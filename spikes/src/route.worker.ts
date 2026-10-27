import { AutoroutingPipelineSolver } from '@tscircuit/capacity-autorouter'
import type { RouteRequest, RouteResponse } from './protocol'

declare const self: DedicatedWorkerGlobalScope

/** Fetched only by the `?probe` negative control, to prove worker traffic reaches the logger. */
const PROBE_URL = 'https://example.com/'

function message(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err)
}

self.addEventListener('message', (event: MessageEvent<RouteRequest>) => {
  void handle(event.data).then((response) => self.postMessage(response))
})

async function handle({ board, probe }: RouteRequest): Promise<RouteResponse> {
  const start = performance.now()
  if (probe) {
    let error: string | null = null
    try {
      await fetch(PROBE_URL)
    } catch (err) {
      error = message(err) // expected: the test aborts the request
    }
    return { status: 'probed', error, traces: [], ms: performance.now() - start }
  }

  try {
    const solver = new AutoroutingPipelineSolver(board)
    solver.solve()
    const ms = performance.now() - start
    if (solver.solved && !solver.failed) {
      return { status: 'solved', error: null, traces: solver.getOutputSimplifiedPcbTraces(), ms }
    }
    return {
      status: 'failed',
      error: solver.error ?? 'solver finished without solved',
      traces: [],
      ms,
    }
  } catch (err) {
    return { status: 'failed', error: message(err), traces: [], ms: performance.now() - start }
  }
}
