// RoutingInput → tscircuit SimpleRouteJson, and tscircuit's SimplifiedPcbTraces → RouteSet. Pure.
// Frames: RoutingInput and RouteSet are KiCad's (mm, y down); the SRJ is y up (y → −y). KiCad's
// pad rotation is counter-clockwise on screen, so it stays the same number as `ccwRotationDegrees`.
import type {
  Obstacle,
  SimpleRouteConnection,
  SimpleRouteJson,
  SimplifiedPcbTrace,
  SimplifiedPcbTraces,
} from '@tscircuit/capacity-autorouter'
import type { Point, Segment } from '../../fixtures/src/kicad-pcb'
import type { RouteSet, RouteTrace, RouteVia } from './route-set'
import { fixedCopperNets, viaConnections, type RerouteMethod } from './route-set'
import type { CopperLayer, RoutingInput } from './routing-input'
import { flattenEdge } from './shapes'

export type SrjLayer = 'top' | 'bottom'
const TO_SRJ: Record<CopperLayer, SrjLayer> = { 'F.Cu': 'top', 'B.Cu': 'bottom' }
const FROM_SRJ: Record<string, CopperLayer> = { top: 'F.Cu', bottom: 'B.Cu' }

/** Chord deviation allowed when Edge.Cuts arcs become the SRJ outline polygon. */
export const OUTLINE_TOLERANCE = 0.005
/** Two Edge.Cuts ends closer than this are the same point when chaining loops. */
const JOIN = 1e-3

const flip = (p: Point): { x: number; y: number } => ({ x: p.x, y: -p.y })
const srjLayers = (layers: readonly CopperLayer[]): SrjLayer[] => layers.map((l) => TO_SRJ[l])

/** The SRJ name of `input.connections[i]`. */
export const connectionName = (i: number): string => `c${i}`

/** The index into `input.connections` of an SRJ connection name, or undefined. */
export function connectionIndex(name: string): number | undefined {
  const m = /^c(\d+)$/.exec(name)
  return m ? Number(m[1]) : undefined
}

/** The connections the engine is asked to route: every one not already realised by fixed copper. */
export function routedIndices(input: RoutingInput): number[] {
  return input.connections.flatMap((c, i) => (c.realisedBy === 'fixed-copper' ? [] : [i]))
}

// --- Outline ---------------------------------------------------------------------------------

/**
 * The Edge.Cuts graphics chained into closed loops, each a polygon (y down, arcs flattened).
 * A graphic's next is the unused one, nearest after it in file order, that starts or ends where
 * it ends; files list each loop's sides together, so this keeps overlapping cutouts apart.
 */
export function outlineLoops(outline: readonly Segment[], tolerance = OUTLINE_TOLERANCE): Point[][] {
  const pieces = outline.map((e) => flattenEdge(e, tolerance))
  const used = new Array<boolean>(pieces.length).fill(false)
  const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) <= JOIN
  const loops: Point[][] = []
  for (let first = 0; first < pieces.length; first++) {
    if (used[first]) continue
    used[first] = true
    const head = pieces[first]!
    if (outline[first]!.kind === 'circle') {
      loops.push(head.slice(0, -1))
      continue
    }
    const loop = [...head]
    let current = first
    for (;;) {
      const end = loop.at(-1)!
      if (loop.length > 2 && near(end, loop[0]!)) break
      let next: { i: number; reversed: boolean } | undefined
      for (let k = 1; k < pieces.length && !next; k++) {
        const i = (current + k) % pieces.length
        if (used[i] || outline[i]!.kind === 'circle') continue
        const p = pieces[i]!
        if (near(p[0]!, end)) next = { i, reversed: false }
        else if (near(p.at(-1)!, end)) next = { i, reversed: true }
      }
      if (!next) throw new Error(`Edge.Cuts graphic ${first} does not close into a loop`)
      used[next.i] = true
      const p = next.reversed ? [...pieces[next.i]!].reverse() : pieces[next.i]!
      loop.push(...p.slice(1))
      current = next.i
    }
    loop.pop() // the closing point repeats the first
    loops.push(loop)
  }
  return loops
}

const area = (pts: readonly Point[]) =>
  pts.reduce((s, p, i) => {
    const q = pts[(i + 1) % pts.length]!
    return s + p.x * q.y - q.x * p.y
  }, 0) / 2

/**
 * A cutout loop as a rect: exact (centre, sides, rotation) when it is a rectangle, else its
 * axis-aligned bounds, which contain it. y down; `r` is counter-clockwise on screen.
 */
export function cutoutRect(loop: readonly Point[]): { x: number; y: number; w: number; h: number; r: number } {
  if (loop.length === 4) {
    const [a, b, c, d] = loop as [Point, Point, Point, Point]
    const ab = { x: b.x - a.x, y: b.y - a.y }
    const bc = { x: c.x - b.x, y: c.y - b.y }
    const square = Math.abs(ab.x * bc.x + ab.y * bc.y) <= 1e-6 * Math.hypot(ab.x, ab.y) * Math.hypot(bc.x, bc.y)
    const closes = Math.hypot(a.x + c.x - b.x - d.x, a.y + c.y - b.y - d.y) <= 1e-6
    if (square && closes) {
      return {
        x: (a.x + c.x) / 2,
        y: (a.y + c.y) / 2,
        w: Math.hypot(ab.x, ab.y),
        h: Math.hypot(bc.x, bc.y),
        // Screen CCW angle of side ab in y down is atan2(−dy, dx).
        r: (Math.atan2(-ab.y, ab.x) * 180) / Math.PI,
      }
    }
  }
  const xs = loop.map((p) => p.x)
  const ys = loop.map((p) => p.y)
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY, r: 0 }
}

/** The board outline (the largest loop) and the cutouts (every other loop), y down. */
export function boardLoops(input: RoutingInput): { board: Point[]; cutouts: Point[][] } {
  const loops = outlineLoops(input.outline)
  if (loops.length === 0) throw new Error('No Edge.Cuts outline')
  let best = 0
  for (const [i, l] of loops.entries()) if (Math.abs(area(l)) > Math.abs(area(loops[best]!))) best = i
  return { board: loops[best]!, cutouts: loops.filter((_, i) => i !== best) }
}

// --- RoutingInput → SimpleRouteJson -----------------------------------------------------------

function rect(
  at: Point,
  w: number,
  h: number,
  r: number,
  layers: SrjLayer[],
  connectedTo: string[],
  extra: Partial<Obstacle> = {},
): Obstacle {
  const o: Obstacle = { type: 'rect', layers, center: flip(at), width: w, height: h, connectedTo, ...extra }
  const rot = ((r % 360) + 360) % 360
  if (rot !== 0) o.ccwRotationDegrees = rot
  return o
}

/** A trace segment's capsule as the rect that covers it: its length plus a half width at each end, by its width. */
function capsuleRect(a: Point, b: Point, width: number, layer: CopperLayer, connectedTo: string[], obstacleId: string): Obstacle {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return rect(
    { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    Math.hypot(dx, dy) + width,
    width,
    (Math.atan2(-dy, dx) * 180) / Math.PI,
    [TO_SRJ[layer]],
    connectedTo,
    { obstacleId },
  )
}

/**
 * The SRJ for `input`. Rules come from `input.rules` and `input.netClasses` only: every clearance
 * field takes `engineClearance` (the strictest class), except board edge (`boardEdgeClearance`)
 * and NPTH holes (`holeClearance`). Connections are `c<index into input.connections>`, every one
 * not realised by fixed copper, each at its net class's width.
 */
export function toSimpleRouteJson(input: RoutingInput): SimpleRouteJson {
  const { rules } = input
  const widthOf = new Map<string, number>()
  for (const c of input.netClasses) for (const n of c.nets) widthOf.set(n, c.traceWidth)
  const padById = new Map(input.pads.map((p) => [p.id, p]))

  const indices = routedIndices(input)
  const touching = new Map<string, string[]>()
  for (const i of indices) {
    const c = input.connections[i]!
    for (const pad of [c.padA, c.padB]) touching.set(pad, [...(touching.get(pad) ?? []), connectionName(i)])
  }

  const obstacles: Obstacle[] = []
  for (const p of input.pads) {
    const to = [p.net, ...(touching.get(p.id) ?? [])]
    if (p.shape === 'circle') {
      obstacles.push(rect(p, p.size.w, p.size.w, 0, srjLayers(p.layers), to, { shape: 'circle', obstacleId: p.id }))
    } else obstacles.push(rect(p, p.size.w, p.size.h, p.r, srjLayers(p.layers), to, { obstacleId: p.id }))
  }
  for (const [i, o] of input.obstacles.entries()) {
    const id = `obstacle:${i}`
    if (o.type === 'np_thru_hole') {
      const d = o.drill ?? o.size
      const round = d.w === d.h
      obstacles.push(
        rect(o, d.w, d.h, round ? 0 : o.r, ['top', 'bottom'], [], {
          isNonPlatedHole: true,
          obstacleId: id,
          ...(round ? { shape: 'circle' as const } : {}),
        }),
      )
    } else if (o.shape === 'circle') {
      obstacles.push(rect(o, o.size.w, o.size.w, 0, srjLayers(o.layers), [], { shape: 'circle', obstacleId: id }))
    } else obstacles.push(rect(o, o.size.w, o.size.h, o.r, srjLayers(o.layers), [], { obstacleId: id }))
  }
  const fixedNets = fixedCopperNets(input)
  for (const [i, t] of input.fixedCopper.entries()) {
    const net = fixedNets[i]
    obstacles.push(capsuleRect(t.start, t.end, t.width, t.layer, net === undefined ? [] : [net], `fixed:${i}`))
  }
  const { board, cutouts } = boardLoops(input)
  // tscircuit keeps its obstacle margin (engineClearance) from the cutout rect, so growing it by
  // the difference puts copper boardEdgeClearance from the real cutout edge.
  const grow = Math.max(0, rules.boardEdgeClearance - rules.engineClearance)
  for (const [i, loop] of cutouts.entries()) {
    const c = cutoutRect(loop)
    obstacles.push(rect(c, c.w + 2 * grow, c.h + 2 * grow, c.r, ['top', 'bottom'], [], { obstacleId: `cutout:${i}` }))
  }

  // Each end gets its own pointId (`c<i>.A`, `c<i>.B`). tscircuit merges connections that share
  // a point into one net and routes its own spanning tree, which loses the connection ids; the
  // split rule's chains share every inner pad, so without the ids every net would merge.
  const point = (padId: string, pointId: string) => {
    const p = padById.get(padId)
    if (!p) throw new Error(`Unknown pad ${padId}`)
    const at = { ...flip(p), pointId }
    return p.layers.length === 1 ? { ...at, layer: TO_SRJ[p.layers[0]!] } : { ...at, layers: srjLayers(p.layers) }
  }
  const connections: SimpleRouteConnection[] = indices.map((i) => {
    const c = input.connections[i]!
    const width = widthOf.get(c.net)
    if (width === undefined) throw new Error(`Net ${c.net} is in no net class`)
    return {
      name: connectionName(i),
      netConnectionName: c.net,
      nominalTraceWidth: width,
      pointsToConnect: [point(c.padA, `${connectionName(i)}.A`), point(c.padB, `${connectionName(i)}.B`)],
    }
  })

  const outline = board.map(flip)
  const xs = outline.map((p) => p.x)
  const ys = outline.map((p) => p.y)
  return {
    layerCount: rules.layers.length,
    // One minimum for every connection: the widest class, so tscircuit never narrows a power
    // trace below its class. Signal traces may then come out wider than 0.15, which is legal.
    minTraceWidth: Math.max(...input.netClasses.map((c) => c.traceWidth)),
    minViaPadDiameter: rules.via.diameter,
    minViaHoleDiameter: rules.via.drill,
    defaultObstacleMargin: rules.engineClearance,
    minTraceToPadEdgeClearance: rules.engineClearance,
    minViaEdgeToPadEdgeClearance: rules.engineClearance,
    minPadEdgeToPadEdgeClearance: rules.engineClearance,
    minViaHoleEdgeToViaHoleEdgeClearance: rules.engineClearance,
    minPlatedHoleDrillEdgeToDrillEdgeClearance: rules.engineClearance,
    minTraceToHoleEdgeClearance: rules.holeClearance,
    minBoardEdgeClearance: rules.boardEdgeClearance,
    obstacles,
    connections,
    bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
    outline,
  }
}

// --- SimplifiedPcbTraces → RouteSet ----------------------------------------------------------

type Hop = SimplifiedPcbTrace['route'][number]

/** A RouteSet, plus what of tscircuit's output it could not take (never dropped silently). */
export interface ConvertedRoutes extends RouteSet {
  /** Trace names that map to no connection. */
  unknown: string[]
  /** Hops that are not copper on this board (jumpers, through-obstacle), by trace name. */
  skipped: string[]
}

/**
 * tscircuit's traces as a RouteSet in KiCad's frame. A trace's wire points become one polyline
 * per run on one layer at one width. A via ends the run, is added at its point with tscircuit's
 * sizes (else `rules.via`), and the next run starts at it. A width change on one layer starts the
 * next run at the same point; a layer change with no via starts it fresh, so it stays a gap.
 */
export function toRouteSet(input: RoutingInput, traces: SimplifiedPcbTraces): ConvertedRoutes {
  const out: ConvertedRoutes = { traces: [], vias: [], unknown: [], skipped: [] }
  for (const t of traces) {
    const i = connectionIndex(t.connection_name)
    const conn = i === undefined ? undefined : input.connections[i]
    if (!conn) {
      out.unknown.push(t.connection_name)
      continue
    }
    let run: { layer: CopperLayer; width: number; points: Point[] } | undefined
    let start: Point | undefined
    const close = () => {
      if (run && run.points.length >= 2) {
        out.traces.push({ connection: conn.id, net: conn.net, layer: run.layer, width: run.width, points: run.points })
      }
      run = undefined
    }
    const extend = (p: Point) => {
      const last = run!.points.at(-1)
      if (!last || last.x !== p.x || last.y !== p.y) run!.points.push(p)
    }
    for (const hop of t.route as Hop[]) {
      if (hop.route_type === 'wire') {
        const layer = FROM_SRJ[hop.layer]
        if (!layer) throw new Error(`Trace ${t.connection_name}: unknown layer ${hop.layer}`)
        if (run && (run.layer !== layer || run.width !== hop.width)) {
          const last = run.points.at(-1)
          const sameLayer = run.layer === layer
          close()
          if (sameLayer) start = last
        }
        if (!run) {
          run = { layer, width: hop.width, points: start ? [start] : [] }
          start = undefined
        }
        extend({ x: hop.x, y: -hop.y })
      } else if (hop.route_type === 'via') {
        const at = { x: hop.x, y: -hop.y }
        if (run) extend(at)
        close()
        out.vias.push({
          at,
          diameter: hop.via_diameter ?? input.rules.via.diameter,
          drill: hop.via_hole_diameter ?? input.rules.via.drill,
          net: conn.net,
        })
        start = at
      } else {
        close()
        start = undefined
        out.skipped.push(`${t.connection_name}: ${hop.route_type}`)
      }
    }
    close()
  }
  return out
}

/** One preloaded tscircuit trace and the RouteSet copper it carries. */
interface Chain {
  trace: SimplifiedPcbTrace
  traces: RouteTrace[]
  vias: RouteVia[]
}

/**
 * A connection's RouteSet traces, in order, as tscircuit traces: a trace continues while the next
 * starts where it ends, on the same layer or through a via of the net there (a via hop); anything
 * else starts the next trace, so no wire is invented across a gap. Ids: `t<i>`, then `t<i>_<k>`.
 */
function chains(input: RoutingInput, routes: RouteSet): Chain[] {
  const index = new Map(input.connections.map((c, i) => [c.id, i]))
  const byConnection = new Map<string, RouteTrace[]>()
  for (const t of routes.traces) byConnection.set(t.connection, [...(byConnection.get(t.connection) ?? []), t])
  const viaAt = (p: Point, net: string): RouteVia | undefined =>
    routes.vias.find((v) => v.net === net && v.at.x === p.x && v.at.y === p.y)
  const out: Chain[] = []
  for (const [id, ts] of byConnection) {
    const i = index.get(id)
    if (i === undefined) throw new Error(`Unknown connection ${id}`)
    let chain: Chain | undefined
    for (const [k, t] of ts.entries()) {
      const prev = ts[k - 1]
      const end = prev?.points.at(-1)
      const via = prev && end && prev.layer !== t.layer ? viaAt(end, t.net) : undefined
      const joins = prev && end && (via || (prev.layer === t.layer && end.x === t.points[0]!.x && end.y === t.points[0]!.y))
      if (!chain || !joins) {
        const n = out.filter((c) => c.trace.connection_name === connectionName(i)).length
        chain = {
          trace: { type: 'pcb_trace', pcb_trace_id: n === 0 ? `t${i}` : `t${i}_${n}`, connection_name: connectionName(i), route: [] },
          traces: [],
          vias: [],
        }
        out.push(chain)
      } else if (via) {
        chain.trace.route.push({
          route_type: 'via',
          x: via.at.x,
          y: -via.at.y,
          from_layer: TO_SRJ[prev!.layer],
          to_layer: TO_SRJ[t.layer],
          via_diameter: via.diameter,
          via_hole_diameter: via.drill,
        })
        chain.vias.push(via)
      }
      chain.traces.push(t)
      for (const p of t.points) chain.trace.route.push({ route_type: 'wire', x: p.x, y: -p.y, width: t.width, layer: TO_SRJ[t.layer] })
    }
  }
  return out
}

/**
 * The inverse of `toRouteSet`: each connection's traces as tscircuit traces (one per continuous
 * run, see `chains`), with a via hop wherever one trace ends on a via of the net where the next
 * begins. Also the saved routes of a `preloaded-traces` reroute.
 */
export function toSimplifiedPcbTraces(input: RoutingInput, routes: RouteSet): SimplifiedPcbTraces {
  return chains(input, routes).map((c) => c.trace)
}

// --- One-key-move reroute ---------------------------------------------------------------------

export type { RerouteMethod }

/**
 * The SRJ of a reroute on the moved board `input`: `toSimpleRouteJson(input)` with `connections`
 * cut to `moved`. Pads keep every connection in `connectedTo`, so saved copper may end on them.
 * `preloaded-traces`: `saved` goes in as SRJ `traces`. `rect-obstacles`: each saved segment goes
 * in as its capsule's cover rect (`saved:<k>`) and each saved via as a both-layer circle
 * (`saved-via:<k>`), `connectedTo` its net and its connection's name.
 */
export function toRerouteJson(input: RoutingInput, saved: RouteSet, moved: readonly string[], method: RerouteMethod): SimpleRouteJson {
  const srj = toSimpleRouteJson(input)
  const keep = new Set(moved)
  const connections = srj.connections.filter((c) => keep.has(input.connections[connectionIndex(c.name)!]!.id))
  if (method === 'preloaded-traces') return { ...srj, connections, traces: toSimplifiedPcbTraces(input, saved) }

  const index = new Map(input.connections.map((c, i) => [c.id, i]))
  const nameOf = (id: string | undefined) => {
    const i = id === undefined ? undefined : index.get(id)
    return i === undefined ? [] : [connectionName(i)]
  }
  const obstacles = [...srj.obstacles]
  let k = 0
  for (const t of saved.traces) {
    for (let j = 1; j < t.points.length; j++) {
      obstacles.push(capsuleRect(t.points[j - 1]!, t.points[j]!, t.width, t.layer, [t.net, ...nameOf(t.connection)], `saved:${k++}`))
    }
  }
  const owners = viaConnections(saved)
  for (const [i, v] of saved.vias.entries()) {
    obstacles.push(
      rect(v.at, v.diameter, v.diameter, 0, ['top', 'bottom'], [v.net, ...nameOf(owners[i])], {
        shape: 'circle',
        obstacleId: `saved-via:${i}`,
      }),
    )
  }
  return { ...srj, connections, obstacles }
}

/**
 * The rerouted set of a `preloaded-traces` reroute: `saved`, less the copper of every preloaded
 * trace a returned trace replaces (`__replaces_pcb_trace_id`), plus `converted` (all returned
 * traces, as `toRouteSet` gives them). `replaced` lists the connection ids of the replaced traces.
 */
export function mergeReroute(
  input: RoutingInput,
  saved: RouteSet,
  converted: RouteSet,
  traces: SimplifiedPcbTraces,
): { routes: RouteSet; replaced: string[] } {
  const ids = new Set(traces.flatMap((t) => (t.__replaces_pcb_trace_id ? [t.__replaces_pcb_trace_id] : [])))
  const gone = chains(input, saved).filter((c) => ids.has(c.trace.pcb_trace_id))
  const goneTraces = new Set(gone.flatMap((c) => c.traces))
  const goneVias = new Set(gone.flatMap((c) => c.vias))
  const replaced = [...new Set(gone.flatMap((c) => c.traces.map((t) => t.connection)))]
  return {
    routes: {
      traces: [...saved.traces.filter((t) => !goneTraces.has(t)), ...converted.traces],
      vias: [...saved.vias.filter((v) => !goneVias.has(v)), ...converted.vias],
    },
    replaced,
  }
}
