import { brokenBoard, testBoard } from './test-board'
import type { RouteRequest, RouteResponse } from './protocol'

const result = document.querySelector<HTMLPreElement>('#result')
if (!result) throw new Error('#result missing')

function show(status: string, body: unknown): void {
  result!.textContent = JSON.stringify(body, null, 2)
  result!.dataset.status = status
}

/** Per-board solve cap for `?corney=` (10× the 60 s bar), unless `&cap=<ms>` says otherwise. */
const CORNEY_CAP_MS = 600_000

const worker = new Worker(new URL('./route.worker.ts', import.meta.url), { type: 'module' })
worker.addEventListener('message', (event: MessageEvent<RouteResponse>) => {
  show(event.data.status, event.data)
})
worker.addEventListener('error', (event) => {
  show('failed', { status: 'failed', error: `worker error: ${event.message}`, thrown: true })
})

/**
 * `?corney=wired|wireless` routes that Corney design. The page builds the SRJ, so the worker's
 * `ms` is solve time only. The design texts load on demand, so the default page stays small.
 */
async function corneyRequest(design: string, capMs: number): Promise<RouteRequest> {
  const [{ CORNEY }, { toRoutingInput }, { toSimpleRouteJson }] = await Promise.all([
    import('./corney'),
    import('./routing-input'),
    import('./tscircuit-adapter'),
  ])
  if (design !== 'wired' && design !== 'wireless') throw new Error(`Unknown Corney design ${design}`)
  return { board: toSimpleRouteJson(toRoutingInput(CORNEY[design])), probe: false, capMs }
}

const params = new URLSearchParams(location.search)
const corney = params.get('corney')
if (corney !== null) {
  const cap = Number(params.get('cap') ?? CORNEY_CAP_MS)
  corneyRequest(corney, Number.isFinite(cap) && cap > 0 ? cap : CORNEY_CAP_MS).then(
    (request) => worker.postMessage(request),
    (err: unknown) => show('failed', { status: 'failed', error: `page: ${String(err)}`, traces: [], ms: 0, thrown: true }),
  )
} else {
  const request: RouteRequest = {
    board: params.has('broken') ? brokenBoard : testBoard,
    probe: params.has('probe'),
  }
  worker.postMessage(request)
}
