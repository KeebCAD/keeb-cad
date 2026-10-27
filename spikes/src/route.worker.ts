import { AutoroutingPipelineSolver, type SimplifiedPcbTraces } from '@tscircuit/capacity-autorouter'
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

/** Whatever traces the solver has; its output step can itself throw on a partial run. */
function tracesOf(solver: AutoroutingPipelineSolver | undefined): { traces: SimplifiedPcbTraces; error?: string } {
  if (!solver) return { traces: [] }
  try {
    return { traces: solver.getOutputSimplifiedPcbTraces() }
  } catch (err) {
    return { traces: [], error: `no traces: ${message(err)}` }
  }
}

async function handle({ board, probe, capMs }: RouteRequest): Promise<RouteResponse> {
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

  let solver: AutoroutingPipelineSolver | undefined
  const cap = capMs ?? Infinity
  try {
    solver = new AutoroutingPipelineSolver(board)
    // solve() in steps, so the cap is checked between them.
    while (!solver.solved && !solver.failed) {
      if (performance.now() - start > cap) {
        const ms = performance.now() - start
        const { traces, error } = tracesOf(solver)
        const why = `not solved within ${cap} ms (${solver.getSolverName()} at iteration ${solver.iterations})`
        return { status: 'timeout', error: error ? `${why}; ${error}` : why, traces, ms }
      }
      solver.step()
    }
    const ms = performance.now() - start
    const { traces, error } = tracesOf(solver)
    if (solver.solved && !solver.failed) {
      if (error) return { status: 'failed', error, traces, ms, thrown: true }
      return { status: 'solved', error: null, traces, ms }
    }
    const why = solver.error ?? 'solver finished without solved'
    return { status: 'failed', error: error ? `${why}; ${error}` : why, traces, ms, thrown: false }
  } catch (err) {
    const ms = performance.now() - start
    const { traces } = tracesOf(solver)
    return { status: 'failed', error: message(err), traces, ms, thrown: true }
  }
}
