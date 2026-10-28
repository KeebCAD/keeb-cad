import { brokenBoard, testBoard } from './test-board'
import type { CustomRouteRequest, CustomRouteResponse, ExternalPage, RouteRequest, RouteResponse } from './protocol'

const result = document.querySelector<HTMLPreElement>('#result')
if (!result) throw new Error('#result missing')

function show(status: string, body: unknown): void {
  result!.textContent = JSON.stringify(body, null, 2)
  result!.dataset.status = status
}

/** Per-board solve cap for `?corney=` (10× the 60 s bar), unless `&cap=<ms>` says otherwise. */
const CORNEY_CAP_MS = 600_000

/**
 * The page's one worker, made on first use, so a page runs only the worker it needs: the
 * tscircuit one (`route.worker.ts`) or, for `&engine=custom`, `custom.worker.ts`. An idle
 * second worker would load its bundle and show in the score scripts' heap samples. Each
 * `new Worker(new URL(…, import.meta.url))` stays written out: that is the form Vite bundles.
 */
function listen<Res>(worker: Worker, onAnswer: (response: Res) => void, onError: (message: string) => void): Worker {
  worker.addEventListener('message', (event: MessageEvent<Res>) => onAnswer(event.data))
  worker.addEventListener('error', (event) => onError(`worker error: ${event.message}`))
  return worker
}

/** `?external`: the caller waiting on the request in flight. */
let pending: ((response: RouteResponse) => void) | undefined
function answer(response: RouteResponse): void {
  const resolve = pending
  pending = undefined
  if (resolve) resolve(response)
  else show(response.status, response)
}
const tscircuitWorker = () =>
  listen<RouteResponse>(new Worker(new URL('./route.worker.ts', import.meta.url), { type: 'module' }), answer, (error) =>
    answer({ status: 'failed', error, traces: [], ms: 0, thrown: true }),
  )

/** The custom router's worker (`custom.worker.ts`). */
const customWorker = (onAnswer: (response: CustomRouteResponse) => void, onError: (message: string) => void) =>
  listen<CustomRouteResponse>(new Worker(new URL('./custom.worker.ts', import.meta.url), { type: 'module' }), onAnswer, onError)

/** A custom worker failure in the custom response's shape (score-custom reads `routes`, `unrouted`). */
const customFailure = (error: string, ids: string[]): CustomRouteResponse => ({
  status: 'failed',
  error,
  routes: { traces: [], vias: [] },
  unrouted: [...ids],
  ms: 0,
  thrown: true,
})

/**
 * `?external&engine=custom` (story 10): `routeCustom` posts one request to the custom worker and
 * resolves with its answer, like `routeBoard`. One call at a time.
 */
function exposeRouteCustom(): void {
  let pending: { resolve: (response: CustomRouteResponse) => void; ids: string[] } | undefined
  const answer = (response: CustomRouteResponse) => {
    const waiting = pending
    pending = undefined
    if (waiting) waiting.resolve(response)
    else show(response.status, response)
  }
  const worker = customWorker(answer, (error) => answer(customFailure(error, pending?.ids ?? [])))
  ;(window as ExternalPage).routeCustom = (request) =>
    new Promise<CustomRouteResponse>((resolve, reject) => {
      if (pending) return reject(new Error('routeCustom: a request is already in flight'))
      pending = { resolve, ids: request.ids }
      worker.postMessage(request)
    })
}

const loadInput = async (design: string) => {
  const [{ CORNEY }, { toRoutingInput }] = await Promise.all([import('./corney'), import('./routing-input')])
  if (design !== 'wired' && design !== 'wireless') throw new Error(`Unknown Corney design ${design}`)
  return toRoutingInput(CORNEY[design])
}

/**
 * `?corney=wired|wireless` routes that Corney design. The page builds the SRJ, so the worker's
 * `ms` is solve time only. The design texts load on demand, so the default page stays small.
 */
async function corneyRequest(design: string, capMs: number): Promise<RouteRequest> {
  const [input, { toSimpleRouteJson }] = await Promise.all([loadInput(design), import('./tscircuit-adapter')])
  return { board: toSimpleRouteJson(input), probe: false, capMs }
}

/**
 * `?corney=<design>&engine=custom`: every `key-cell` and `routing` connection, routed by the
 * custom router in its own worker. The page builds the RoutingInput, so `ms` is routing time.
 */
async function customRequest(design: string, capMs: number, broken: boolean, probe: boolean): Promise<CustomRouteRequest> {
  const input = await loadInput(design)
  const ids = input.connections.filter((c) => c.realisedBy === 'key-cell' || c.realisedBy === 'routing').map((c) => c.id)
  // `&broken`: a negative control, an id the router does not know, so it throws in the worker.
  if (broken) ids.push(BROKEN_ID)
  return { input, ids, capMs, probe }
}

/** The unknown connection id `&broken` adds. */
const BROKEN_ID = 'NOPE:X1.1.F~X2.1.F'

const pageFailed = (err: unknown) => show('failed', { status: 'failed', error: `page: ${String(err)}`, traces: [], ms: 0, thrown: true })

/** `?outline` (story 11): builds after a warm-up, timed one by one on the main thread. */
const OUTLINE_WARMUP = 5
const OUTLINE_RUNS = 30
const OUTLINE_TOL = 0.005

/**
 * `?outline` (or `?outline=corney`): Corney's `_pcb_outline` built from its model shapes;
 * `?outline=lambbt` (story 12): LambBT's `pcb`, its board polygon minus the r = 150 circle
 * (makerjs `combineSubtraction`). Evaluate, `toSegments`, `mergeCollinear` and flatten on the
 * page's main thread, `OUTLINE_RUNS` times after `OUTLINE_WARMUP` builds. Shows the median and max ms and the flattened vertex count.
 */
async function outlineLatency(design: string): Promise<void> {
  const [{ CORNEY_POINTS }, shapes, { flatten, mergeCollinear, toSegments, vertexCount }] = await Promise.all([
    import('./corney'),
    import('./outline-shapes'),
    import('./flatten'),
  ])
  const outline =
    design === 'corney'
      ? { shapes: shapes.CORNEY_OUTLINE_SHAPES, id: shapes.CORNEY_OUTLINE_ID, points: shapes.readPoints(CORNEY_POINTS) }
      : design === 'lambbt'
        ? { shapes: shapes.LAMBBT_OUTLINE_SHAPES, id: shapes.LAMBBT_OUTLINE_ID, points: shapes.LAMBBT_POSES }
        : undefined
  if (!outline) throw new Error(`Unknown outline ${design}`)
  const build = () => {
    const evaluated = shapes.evaluate(outline.shapes, outline.id, outline.points)
    if (evaluated.kind !== 'model') throw new Error(`${evaluated.id}: ${evaluated.reason}`)
    // The verdict's pipeline: exact paths, collinear splits merged, then the one flatten.
    return flatten(mergeCollinear(toSegments(evaluated.model)).segments, OUTLINE_TOL)
  }
  for (let i = 0; i < OUTLINE_WARMUP; i++) build()
  const times: number[] = []
  let loops: ReturnType<typeof build> = []
  for (let i = 0; i < OUTLINE_RUNS; i++) {
    const start = performance.now()
    loops = build()
    times.push(performance.now() - start)
  }
  const sorted = times.toSorted((a, b) => a - b)
  const medianMs = (sorted[(sorted.length - 1) >> 1]! + sorted[sorted.length >> 1]!) / 2
  show('solved', {
    status: 'solved',
    outline: design,
    medianMs,
    maxMs: sorted.at(-1)!,
    runs: OUTLINE_RUNS,
    vertices: vertexCount(loops),
    loops: loops.length,
    tol: OUTLINE_TOL,
  })
}

const params = new URLSearchParams(location.search)
const corney = params.get('corney')
const engine = params.get('engine') ?? 'tscircuit'
if (params.has('outline')) {
  outlineLatency(params.get('outline') || 'corney').catch((err: unknown) => show('failed', { status: 'failed', error: `page: ${String(err)}` }))
} else if (params.has('external')) {
  if (engine === 'custom') exposeRouteCustom()
  else {
    const worker = tscircuitWorker()
    ;(window as ExternalPage).routeBoard = (request) =>
      new Promise<RouteResponse>((resolve, reject) => {
        if (pending) return reject(new Error('routeBoard: a request is already in flight'))
        pending = resolve
        worker.postMessage(request)
      })
  }
  show('ready', { status: 'ready' })
} else if (corney !== null) {
  const cap = Number(params.get('cap') ?? CORNEY_CAP_MS)
  const capMs = Number.isFinite(cap) && cap > 0 ? cap : CORNEY_CAP_MS
  if (engine === 'custom') {
    const customFailed = (error: string, ids: string[]) => show('failed', customFailure(error, ids))
    customRequest(corney, capMs, params.has('broken'), params.has('probe')).then((request) => {
      const worker = customWorker(
        (response) => show(response.status, response),
        (error) => customFailed(error, request.ids),
      )
      worker.postMessage(request)
    }, (err: unknown) => customFailed(`page: ${String(err)}`, []))
  } else if (engine === 'tscircuit') {
    corneyRequest(corney, capMs).then((request) => tscircuitWorker().postMessage(request), pageFailed)
  } else pageFailed(new Error(`Unknown engine ${engine}`))
} else {
  const request: RouteRequest = {
    board: params.has('broken') ? brokenBoard : testBoard,
    probe: params.has('probe'),
  }
  tscircuitWorker().postMessage(request)
}
