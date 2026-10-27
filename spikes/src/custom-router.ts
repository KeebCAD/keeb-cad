// keeb-cad's own spike router (entry 8): two-layer grid A* with octilinear moves and vias, one
// connection at a time, on an obstacle field built from the RoutingInput. Pure and deterministic:
// no Node, no DOM, so story 9 runs it in the worker unchanged. Frame: KiCad's, mm, y down.
//
// The field: every obstacle (pad, netless pad, NPTH hole, fixed copper, Edge.Cuts graphic, keep-out
// and the router's own earlier copper) is a core (point, segment, polygon or polyline) inflated with
// clipper2 by its clearance (`rules`), plus the half width of what is being placed (a trace of one
// class, or a via), plus a grid margin. Each inflated item carries its net. A grid point is free for
// a net when it lies in no inflated item of another net (netless items block every net). The
// inflated items are indexed in flatbush (exact segment checks for pad stubs) and scan-filled into
// one raster per layer and per placed width, which the search reads.
//
// The margin is half a diagonal step (step·√2/2) for traces: a point of a segment between two
// neighbouring grid points is within that distance of one of them, so if both are free the whole
// segment keeps its clearance. Vias sit on grid points, so their field has no margin. Arc
// flattening and clipper's chords and rounding add `tol`, always outwards.
//
// After the first pass (shortest first), a bounded rip-up and reroute (story 9's decision): each
// unrouted connection is searched on the static field only, with a cost (`crossCost`) for steps
// onto the router's own copper; the placed connections its copper comes within clearance of are
// ripped up, it is placed, and they are rerouted. The attempt is kept only if all of them reroute,
// so the routed count only grows. `ripUpRounds` rounds, deterministic. An optional deadline
// (`deadlineMs` on an injected clock) is checked between connections.
import { EndType, JoinType, inflatePathsD, type PathsD } from 'clipper2-ts'
import Flatbush from 'flatbush'
import type { Point } from '../../fixtures/src/kicad-pcb'
import { fixedCopperNets, type RouteSet, type RouteTrace, type RouteVia } from './route-set'
import type { Connection, CopperLayer, RoutingInput, RoutingPad } from './routing-input'
import {
  coreDistance,
  edgeBounds,
  flattenEdge,
  padShape,
  segmentPolygon,
  traceShape,
  viaShape,
  type Core,
  type Shape,
} from './shapes'

export interface RouterOptions {
  /** Grid step in mm. Default 0.1: Corney's tightest gaps (MCU pins at 2.54 mm) need ≤ 0.1. */
  step?: number
  /** Extra cost of a via, in mm of trace. Default 1.5. */
  viaCost?: number
  /** Extra cost of a change of direction, in mm of trace. Default 0.2. */
  bendCost?: number
  /** Rounds of rip-up and reroute after the first pass. Default 3; 0 turns it off. */
  ripUpRounds?: number
  /**
   * Rip-up search only: extra cost, in mm of trace, of each grid step (or via) onto the router's
   * own copper of another net, which that search does not treat as an obstacle. Default 3, so the
   * path rips up few connections. A cost, not a rule: clearances are untouched.
   */
  crossCost?: number
  /**
   * Stop starting work once `now()` is past this time (on `now`'s clock). Checked between
   * connections only: one A* search is not interrupted.
   */
  deadlineMs?: number
  /** The clock `deadlineMs` is on. Default `performance.now`. Injected, so tests (and the router) stay pure. */
  now?: () => number
}

export interface RouteResult {
  routes: RouteSet
  /** Ids the router could not route (or did not reach before the deadline), in routing order. They have no traces or vias in `routes`. */
  unrouted: string[]
  /** The deadline passed: the routes are what was placed by then. */
  timedOut: boolean
}

export const DEFAULT_STEP = 0.1

/** clipper2-ts precision (decimal places) and arc tolerance, in mm. */
const PRECISION = 4
const ARC_TOL = 0.002
/** Chord deviation when flattening Edge.Cuts arcs. */
const EDGE_DEVIATION = 0.002
/** Every outward error: clipper chords, clipper rounding, arc flattening. */
const TOL = ARC_TOL + 10 ** -PRECISION + EDGE_DEVIATION

/** Net code of netless copper and holes: blocks every net. */
const BLOCK_ALL = -1

type Rule = 'copper' | 'hole' | 'edge' | 'keep-out'

/** One obstacle before inflation. `open` cores are polylines (Edge.Cuts graphics). */
interface Item {
  net: number
  layers: [boolean, boolean]
  rule: Rule
  core: Core | { kind: 'polyline'; pts: Point[] }
  r: number
}

const LAYERS: readonly CopperLayer[] = ['F.Cu', 'B.Cu']
const layerIndex = (l: CopperLayer) => (l === 'F.Cu' ? 0 : 1)

function inflate(item: Item, delta: number): PathsD {
  const d = item.r + delta
  const c = item.core
  const opts = [2, PRECISION, ARC_TOL] as const
  if (c.kind === 'point') return inflatePathsD([[c.p]], d, JoinType.Round, EndType.Round, ...opts)
  if (c.kind === 'segment') return inflatePathsD([[c.a, c.b]], d, JoinType.Round, EndType.Round, ...opts)
  if (c.kind === 'polyline') return inflatePathsD([c.pts], d, JoinType.Round, EndType.Round, ...opts)
  return inflatePathsD([c.pts], d, JoinType.Round, EndType.Polygon, ...opts)
}

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function pathsBounds(paths: PathsD): Bounds {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const path of paths) {
    for (const p of path) {
      b.minX = Math.min(b.minX, p.x)
      b.minY = Math.min(b.minY, p.y)
      b.maxX = Math.max(b.maxX, p.x)
      b.maxY = Math.max(b.maxY, p.y)
    }
  }
  return b
}

/** The grid: points at (x0 + i·step, y0 + j·step). */
interface Grid {
  x0: number
  y0: number
  step: number
  nx: number
  ny: number
}

/**
 * One placed width (a trace class's half width, or a via's radius): the inflated items, a
 * flatbush over the static ones, and a raster per layer of who blocks each grid point.
 * Raster value: 0 free, n > 0 blocked for every net but n, BLOCK_ALL blocked for all.
 */
class Field {
  readonly raster: [Int32Array, Int32Array]
  private readonly staticItems: Array<{ net: number; layers: [boolean, boolean]; paths: PathsD }>
  private readonly dynamicItems: Array<{ net: number; layers: [boolean, boolean]; paths: PathsD; box: Bounds }> = []
  private index: Flatbush | undefined
  private readonly grid: Grid
  private readonly delta: (rule: Rule) => number

  /** An empty field, or with `from`, a copy of `from`'s static items (call before any dynamic one). */
  constructor(grid: Grid, delta: (rule: Rule) => number, from?: Field) {
    this.grid = grid
    this.delta = delta
    const n = grid.nx * grid.ny
    if (from) {
      if (from.dynamicItems.length > 0) throw new Error('Field: copy a static-only field')
      this.raster = [from.raster[0].slice(), from.raster[1].slice()]
      this.staticItems = from.staticItems
      this.index = from.index
    } else {
      this.raster = [new Int32Array(n), new Int32Array(n)]
      this.staticItems = []
    }
  }

  addStatic(items: readonly Item[]): void {
    const boxes: Bounds[] = []
    for (const item of items) {
      const paths = inflate(item, this.delta(item.rule))
      this.staticItems.push({ net: item.net, layers: item.layers, paths })
      boxes.push(pathsBounds(paths))
      this.fill(item.net, item.layers, paths)
    }
    if (boxes.length > 0) {
      const index = new Flatbush(boxes.length)
      for (const b of boxes) index.add(b.minX, b.minY, b.maxX, b.maxY)
      index.finish()
      this.index = index
    }
  }

  addDynamic(item: Item): void {
    const paths = inflate(item, this.delta(item.rule))
    this.dynamicItems.push({ net: item.net, layers: item.layers, paths, box: pathsBounds(paths) })
    this.fill(item.net, item.layers, paths)
  }

  free(layer: number, cell: number, net: number): boolean {
    const v = this.raster[layer]![cell]!
    return v === 0 || v === net
  }

  /** Exact check of segment ab on `layer` against every inflated item of another net. */
  segmentFree(layer: number, a: Point, b: Point, net: number): boolean {
    const box = {
      minX: Math.min(a.x, b.x),
      minY: Math.min(a.y, b.y),
      maxX: Math.max(a.x, b.x),
      maxY: Math.max(a.y, b.y),
    }
    const hits = (it: { net: number; layers: [boolean, boolean]; paths: PathsD }) =>
      it.layers[layer] && (it.net === BLOCK_ALL || it.net !== net) && it.paths.some((p) => segmentPolygon(a, b, p).d === 0)
    if (this.index) {
      for (const k of this.index.search(box.minX, box.minY, box.maxX, box.maxY)) if (hits(this.staticItems[k]!)) return false
    }
    for (const it of this.dynamicItems) {
      if (it.box.maxX < box.minX || it.box.minX > box.maxX || it.box.maxY < box.minY || it.box.minY > box.maxY) continue
      if (hits(it)) return false
    }
    return true
  }

  /** Scan-fills the grid points inside `paths` (even-odd) on `layers`. */
  private fill(net: number, layers: [boolean, boolean], paths: PathsD): void {
    const { x0, y0, step, nx, ny } = this.grid
    const b = pathsBounds(paths)
    const j0 = Math.max(0, Math.ceil((b.minY - y0) / step))
    const j1 = Math.min(ny - 1, Math.floor((b.maxY - y0) / step))
    const xs: number[] = []
    for (let j = j0; j <= j1; j++) {
      const y = y0 + j * step
      xs.length = 0
      for (const path of paths) {
        for (let k = 0, m = path.length - 1; k < path.length; m = k++) {
          const p = path[k]!
          const q = path[m]!
          if (p.y > y !== q.y > y) xs.push(p.x + ((y - p.y) * (q.x - p.x)) / (q.y - p.y))
        }
      }
      xs.sort((u, v) => u - v)
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const i0 = Math.max(0, Math.ceil((xs[k]! - x0) / step))
        const i1 = Math.min(nx - 1, Math.floor((xs[k + 1]! - x0) / step))
        for (let i = i0; i <= i1; i++) {
          const cell = j * nx + i
          for (let l = 0; l < 2; l++) {
            if (!layers[l]) continue
            const r = this.raster[l]!
            const v = r[cell]!
            r[cell] = v === 0 ? net : v === net ? v : BLOCK_ALL
          }
        }
      }
    }
  }
}

/** Binary min-heap of node ids by f, ties by insertion order (deterministic). */
class Heap {
  private f: number[] = []
  private seq: number[] = []
  private node: number[] = []
  private n = 0
  private counter = 0

  get size() {
    return this.n
  }

  clear() {
    this.n = 0
    this.counter = 0
  }

  private less(a: number, b: number) {
    return this.f[a]! < this.f[b]! || (this.f[a] === this.f[b] && this.seq[a]! < this.seq[b]!)
  }

  private swap(a: number, b: number) {
    ;[this.f[a], this.f[b]] = [this.f[b]!, this.f[a]!]
    ;[this.seq[a], this.seq[b]] = [this.seq[b]!, this.seq[a]!]
    ;[this.node[a], this.node[b]] = [this.node[b]!, this.node[a]!]
  }

  push(node: number, f: number) {
    let i = this.n++
    this.f[i] = f
    this.seq[i] = this.counter++
    this.node[i] = node
    while (i > 0) {
      const p = (i - 1) >> 1
      if (!this.less(i, p)) break
      this.swap(i, p)
      i = p
    }
  }

  pop(): number {
    const top = this.node[0]!
    this.n--
    if (this.n > 0) {
      this.f[0] = this.f[this.n]!
      this.seq[0] = this.seq[this.n]!
      this.node[0] = this.node[this.n]!
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < this.n && this.less(l, m)) m = l
        if (r < this.n && this.less(r, m)) m = r
        if (m === i) break
        this.swap(i, m)
        i = m
      }
    }
    return top
  }
}

// Directions 0–7: E, SE, S, SW, W, NW, N, NE (y down). 8 is a via; -1 is a start.
const DX = [1, 1, 0, -1, -1, -1, 0, 1]
const DY = [0, 1, 1, 1, 0, -1, -1, -1]
const VIA_DIR = 8

/** Which connections to route, checked: unknown and fixed-copper ids throw, naming the id. */
function chosen(input: RoutingInput, ids: readonly string[]): Connection[] {
  const byId = new Map(input.connections.map((c) => [c.id, c]))
  const out: Connection[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    const c = byId.get(id)
    if (!c) throw new Error(`Unknown connection id: ${id}`)
    if (c.realisedBy === 'fixed-copper') throw new Error(`Connection ${id} is realised by fixed copper; nothing to route`)
    if (seen.has(id)) continue
    seen.add(id)
    out.push(c)
  }
  return out
}

function gridOf(input: RoutingInput, step: number): Grid {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  const grow = (x0: number, y0: number, x1: number, y1: number) => {
    b.minX = Math.min(b.minX, x0)
    b.minY = Math.min(b.minY, y0)
    b.maxX = Math.max(b.maxX, x1)
    b.maxY = Math.max(b.maxY, y1)
  }
  for (const e of input.outline) {
    const eb = edgeBounds(e)
    grow(eb.minX, eb.minY, eb.maxX, eb.maxY)
  }
  for (const p of input.pads) grow(p.x, p.y, p.x, p.y)
  // A board with no outline still gets room round its pads.
  const pad = input.outline.length > 0 ? 1 : 10
  const x0 = Math.floor((b.minX - pad) / step) * step
  const y0 = Math.floor((b.minY - pad) / step) * step
  return {
    x0,
    y0,
    step,
    nx: Math.ceil((b.maxX + pad - x0) / step) + 1,
    ny: Math.ceil((b.maxY + pad - y0) / step) + 1,
  }
}

export function routeConnections(input: RoutingInput, ids: readonly string[], options: RouterOptions = {}): RouteResult {
  const step = options.step ?? DEFAULT_STEP
  const viaCost = options.viaCost ?? 1.5
  const bendCost = options.bendCost ?? 0.2
  const ripUpRounds = options.ripUpRounds ?? 3
  const crossCost = options.crossCost ?? 3
  const now = options.now ?? (() => performance.now())
  const deadline = options.deadlineMs
  const pastDeadline = () => deadline !== undefined && now() > deadline
  const connections = chosen(input, ids)

  const { rules } = input
  const netCode = new Map<string, number>()
  const codeOf = (net: string | undefined) => {
    if (net === undefined) return BLOCK_ALL
    let c = netCode.get(net)
    if (c === undefined) netCode.set(net, (c = netCode.size + 1))
    return c
  }
  const classOf = new Map<string, { traceWidth: number }>()
  for (const c of input.netClasses) for (const n of c.nets) classOf.set(n, c)
  const widthOf = (net: string) => {
    const c = classOf.get(net)
    if (!c) throw new Error(`Net ${net} is in no net class`)
    return c.traceWidth
  }

  const clearance: Record<Rule, number> = {
    copper: rules.engineClearance,
    hole: rules.holeClearance,
    edge: rules.boardEdgeClearance,
    'keep-out': 0,
  }
  const layersOf = (ls: readonly CopperLayer[]): [boolean, boolean] => [ls.includes('F.Cu'), ls.includes('B.Cu')]
  const shapeItem = (net: number, layers: [boolean, boolean], rule: Rule, s: Shape): Item => ({ net, layers, rule, core: s.core, r: s.r })

  // Static obstacles.
  const items: Item[] = []
  for (const p of input.pads) items.push(shapeItem(codeOf(p.net), layersOf(p.layers), 'copper', padShape(p)))
  for (const o of input.obstacles) {
    if (o.type === 'np_thru_hole') {
      const drill = o.drill ?? o.size
      const hole = padShape({ ...o, shape: drill.w === drill.h ? 'circle' : 'oval', size: drill })
      items.push(shapeItem(BLOCK_ALL, [true, true], 'hole', hole))
    } else items.push(shapeItem(BLOCK_ALL, layersOf(o.layers), 'copper', padShape(o)))
  }
  const fixedNets = fixedCopperNets(input)
  for (const [i, t] of input.fixedCopper.entries()) {
    items.push(shapeItem(codeOf(fixedNets[i]), layersOf([t.layer]), 'copper', traceShape(t.start, t.end, t.width)))
  }
  for (const e of input.outline) {
    items.push({ net: BLOCK_ALL, layers: [true, true], rule: 'edge', core: { kind: 'polyline', pts: flattenEdge(e, EDGE_DEVIATION) }, r: 0 })
  }
  for (const k of input.keepOuts) {
    items.push({ net: BLOCK_ALL, layers: layersOf(k.layers), rule: 'keep-out', core: { kind: 'polygon', pts: k.polygon }, r: 0 })
  }

  const grid = gridOf(input, step)
  const margin = (step * Math.SQRT2) / 2
  const fieldDelta = (radius: number, gridMargin: number) => (rule: Rule) => clearance[rule] + radius + gridMargin + TOL
  /** Static obstacles only, per placed width: the rip-up's search, and the base of every field. */
  const staticFields = new Map<string, Field>()
  /** Static obstacles plus the router's own copper (`placed`). Dropped whole when copper is ripped up. */
  const fields = new Map<string, Field>()
  /** The router's own copper, by connection id. */
  const placed = new Map<string, Placed>()
  const fieldFor = (withPlaced: boolean, key: string, radius: number, gridMargin: number) => {
    let base = staticFields.get(key)
    if (!base) {
      base = new Field(grid, fieldDelta(radius, gridMargin))
      base.addStatic(items)
      staticFields.set(key, base)
    }
    if (!withPlaced) return base
    let f = fields.get(key)
    if (!f) {
      f = new Field(grid, fieldDelta(radius, gridMargin), base)
      for (const p of placed.values()) for (const it of p.items) f.addDynamic(it)
      fields.set(key, f)
    }
    return f
  }
  const viaField = (withPlaced: boolean) => fieldFor(withPlaced, 'via', rules.via.diameter / 2, 0)
  const traceField = (withPlaced: boolean, width: number) => fieldFor(withPlaced, `trace:${width}`, width / 2, margin)

  const { nx, ny, x0, y0 } = grid
  const N = nx * ny
  const at = (cell: number): Point => ({ x: x0 + (cell % nx) * step, y: y0 + Math.floor(cell / nx) * step })
  const g = new Float64Array(2 * N)
  const parent = new Int32Array(2 * N)
  const dirIn = new Int8Array(2 * N)
  const seen = new Uint32Array(2 * N)
  const closed = new Uint32Array(2 * N)
  const goal = new Uint32Array(2 * N)
  let gen = 0
  const heap = new Heap()

  /** Grid points on the pad's copper per layer; a stub to the centre when there are none. */
  const padNodes = (pad: RoutingPad, field: Field, net: number) => {
    const s = padShape(pad)
    const nodes: Array<{ node: number; stub?: Point }> = []
    const reach = Math.hypot(pad.size.w, pad.size.h) / 2 + 2 * step
    const i0 = Math.max(0, Math.ceil((pad.x - reach - x0) / step))
    const i1 = Math.min(nx - 1, Math.floor((pad.x + reach - x0) / step))
    const j0 = Math.max(0, Math.ceil((pad.y - reach - y0) / step))
    const j1 = Math.min(ny - 1, Math.floor((pad.y + reach - y0) / step))
    const centre = { x: pad.x, y: pad.y }
    for (const layer of pad.layers) {
      const l = layerIndex(layer)
      const inside: number[] = []
      const near: number[] = []
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const cell = j * nx + i
          if (!field.free(l, cell, net)) continue
          const d = coreDistance({ kind: 'point', p: at(cell) }, s.core).d
          if (d <= s.r) inside.push(cell)
          else near.push(cell)
        }
      }
      if (inside.length > 0) for (const cell of inside) nodes.push({ node: l * N + cell })
      else {
        for (const cell of near) {
          if (field.segmentFree(l, centre, at(cell), net)) nodes.push({ node: l * N + cell, stub: centre })
        }
      }
    }
    return nodes
  }

  const padById = new Map(input.pads.map((p) => [p.id, p]))
  const order: Entry[] = connections
    .map((c) => {
      const a = padById.get(c.padA)
      const b = padById.get(c.padB)
      if (!a || !b) throw new Error(`Connection ${c.id}: unknown pad`)
      return { c, a, b, length: Math.hypot(a.x - b.x, a.y - b.y) }
    })
    .sort((p, q) => p.length - q.length || (p.c.id < q.c.id ? -1 : p.c.id > q.c.id ? 1 : 0))

  /** A* for one connection on the given fields: its copper, or undefined when it has no path. */
  const search = ({ c, a, b }: Entry, tf: Field, vf: Field, soft?: { tf: Field; vf: Field }): Placed | undefined => {
    const net = codeOf(c.net)
    const width = widthOf(c.net)
    gen++
    heap.clear()

    const starts = padNodes(a, tf, net)
    const goals = padNodes(b, tf, net)
    const stubOf = new Map<number, Point>()
    for (const s of starts) if (s.stub) stubOf.set(s.node, s.stub)
    const goalStub = new Map<number, Point>()
    for (const t of goals) {
      goal[t.node] = gen
      if (t.stub) goalStub.set(t.node, t.stub)
    }
    const bLayers = layersOf(b.layers)
    const reachB = Math.hypot(b.size.w, b.size.h) / 2
    const h = (node: number) => {
      const l = node >= N ? 1 : 0
      const cell = node - l * N
      const dx = Math.abs(x0 + (cell % nx) * step - b.x)
      const dy = Math.abs(y0 + Math.floor(cell / nx) * step - b.y)
      const oct = Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)
      return Math.max(0, oct - reachB) + (bLayers[l] ? 0 : viaCost)
    }
    for (const s of starts) {
      if (seen[s.node] === gen) continue
      seen[s.node] = gen
      g[s.node] = 0
      parent[s.node] = -1
      dirIn[s.node] = -1
      heap.push(s.node, h(s.node))
    }

    let found = -1
    while (heap.size > 0) {
      const node = heap.pop()
      if (closed[node] === gen) continue
      closed[node] = gen
      const l = node >= N ? 1 : 0
      const cell = node - l * N
      const din = dirIn[node]!
      if (goal[node] === gen && din !== VIA_DIR) {
        found = node
        break
      }
      const gi = g[node]!
      const ci = cell % nx
      const cj = (cell - ci) / nx
      const relax = (next: number, cost: number, dir: number) => {
        if (closed[next] === gen) return
        if (seen[next] === gen && g[next]! <= cost) return
        seen[next] = gen
        g[next] = cost
        parent[next] = node
        dirIn[next] = dir
        heap.push(next, cost + h(next))
      }
      for (let d = 0; d < 8; d++) {
        const i = ci + DX[d]!
        const j = cj + DY[d]!
        if (i < 0 || j < 0 || i >= nx || j >= ny) continue
        const nc = j * nx + i
        if (!tf.free(l, nc, net)) continue
        const len = d % 2 === 0 ? step : step * Math.SQRT2
        const crossing = soft && !soft.tf.free(l, nc, net) ? crossCost : 0
        relax(l * N + nc, gi + len + crossing + (din >= 0 && din < 8 && din !== d ? bendCost : 0), d)
      }
      // A via: not at a start, not right after another via, free on both layers.
      if (din !== -1 && din !== VIA_DIR && vf.free(0, cell, net) && vf.free(1, cell, net)) {
        const other = (1 - l) * N + cell
        // Goals are reached only by trace moves: the state has no direction, so a goal closed after
        // a via would drop a later same-layer arrival.
        const crossing = soft && !(soft.vf.free(0, cell, net) && soft.vf.free(1, cell, net)) ? crossCost : 0
        if (goal[other] !== gen && tf.free(1 - l, cell, net)) relax(other, gi + viaCost + crossing, VIA_DIR)
      }
    }
    if (found < 0) return undefined

    // Walk back to the start, then split into runs per layer, with a via at each layer change.
    const path: number[] = []
    for (let n = found; n !== -1; n = parent[n]!) path.push(n)
    path.reverse()
    const traces: RouteTrace[] = []
    const vias: RouteVia[] = []
    let run: Point[] = []
    const startStub = stubOf.get(path[0]!)
    if (startStub) run.push(startStub)
    const flush = (layer: number) => {
      const pts = simplify(run)
      if (pts.length >= 2) traces.push({ connection: c.id, net: c.net, layer: LAYERS[layer]!, width, points: pts })
    }
    for (let k = 0; k < path.length; k++) {
      const n = path[k]!
      const l = n >= N ? 1 : 0
      const p = at(n - l * N)
      if (k > 0 && dirIn[n] === VIA_DIR) {
        flush(1 - l)
        vias.push({ at: p, diameter: rules.via.diameter, drill: rules.via.drill, net: c.net })
        run = []
      }
      run.push(p)
    }
    const endStub = goalStub.get(found)
    if (endStub) run.push(endStub)
    flush(found >= N ? 1 : 0)
    // A path with no trace (start on the goal, or every run under 2 points) realises nothing.
    if (traces.length === 0) return undefined

    const added: Item[] = []
    for (const t of traces) {
      for (let k = 1; k < t.points.length; k++) {
        added.push(shapeItem(net, layersOf([t.layer]), 'copper', traceShape(t.points[k - 1]!, t.points[k]!, t.width)))
      }
    }
    for (const v of vias) added.push(shapeItem(net, [true, true], 'copper', viaShape(v.at, v.diameter)))
    return { net, traces, vias, items: added }
  }

  const place = (id: string, p: Placed) => {
    placed.set(id, p)
    for (const f of fields.values()) for (const it of p.items) f.addDynamic(it)
  }
  const routeOn = (e: Entry, withPlaced: boolean) => search(e, traceField(withPlaced, widthOf(e.c.net)), viaField(withPlaced))

  /**
   * Rip-up and reroute for one unrouted connection: route it ignoring the router's own copper,
   * rip up every placed connection of another net its copper comes within clearance of, place
   * it, and reroute the ripped ones (routing order). Kept only if every ripped one reroutes, so
   * the routed count only grows; otherwise everything is put back as it was.
   */
  const ripUp = (e: Entry): 'placed' | 'kept' | 'timeout' => {
    const width = widthOf(e.c.net)
    const p = search(e, traceField(false, width), viaField(false), { tf: traceField(true, width), vf: viaField(true) })
    if (!p) return 'kept'
    const victims = new Set<string>()
    for (const [id, q] of placed) if (q.net !== p.net && conflicts(p.items, q.items, clearance.copper)) victims.add(id)
    const before = new Map(placed)
    for (const id of victims) placed.delete(id)
    fields.clear()
    place(e.c.id, p)
    let outcome: 'placed' | 'kept' | 'timeout' = 'placed'
    for (const o of order) {
      if (!victims.has(o.c.id)) continue
      if (pastDeadline()) {
        outcome = 'timeout'
        break
      }
      const q = routeOn(o, true)
      if (!q) {
        outcome = 'kept'
        break
      }
      place(o.c.id, q)
    }
    if (outcome !== 'placed') {
      placed.clear()
      for (const [id, q] of before) placed.set(id, q)
      fields.clear()
    }
    return outcome
  }

  let timedOut = false
  for (const e of order) {
    if (pastDeadline()) {
      timedOut = true
      break
    }
    const p = routeOn(e, true)
    if (p) place(e.c.id, p)
  }
  for (let round = 0; round < ripUpRounds && !timedOut; round++) {
    let progress = false
    for (const e of order) {
      if (placed.has(e.c.id)) continue
      if (pastDeadline()) {
        timedOut = true
        break
      }
      const outcome = ripUp(e)
      if (outcome === 'timeout') {
        timedOut = true
        break
      }
      if (outcome === 'placed') progress = true
    }
    if (!progress) break
  }

  const routes: RouteSet = { traces: [], vias: [] }
  const unrouted: string[] = []
  for (const { c } of order) {
    const p = placed.get(c.id)
    if (!p) {
      unrouted.push(c.id)
      continue
    }
    routes.traces.push(...p.traces)
    routes.vias.push(...p.vias)
  }
  return { routes, unrouted, timedOut }
}

/** A connection to route, with its pads and its pad-to-pad length (the routing order). */
interface Entry {
  c: Connection
  a: RoutingPad
  b: RoutingPad
  length: number
}

/** One connection's copper: its traces and vias, and the same as obstacle items. */
interface Placed {
  net: number
  traces: RouteTrace[]
  vias: RouteVia[]
  items: Item[]
}

/** Whether any item of `xs` comes within `gap` (+ tolerance) of an item of `ys` on a shared layer. */
function conflicts(xs: readonly Item[], ys: readonly Item[], gap: number): boolean {
  for (const x of xs) {
    const bx = itemBounds(x)
    for (const y of ys) {
      if (!((x.layers[0] && y.layers[0]) || (x.layers[1] && y.layers[1]))) continue
      const by = itemBounds(y)
      const reach = gap + TOL
      if (bx.maxX + reach < by.minX || by.maxX + reach < bx.minX || bx.maxY + reach < by.minY || by.maxY + reach < bx.minY) continue
      if (coreDistance(x.core as Core, y.core as Core).d - x.r - y.r < reach) return true
    }
  }
  return false
}

function itemBounds(it: Item): Bounds {
  const c = it.core
  const pts = c.kind === 'point' ? [c.p] : c.kind === 'segment' ? [c.a, c.b] : c.pts
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const p of pts) {
    b.minX = Math.min(b.minX, p.x - it.r)
    b.minY = Math.min(b.minY, p.y - it.r)
    b.maxX = Math.max(b.maxX, p.x + it.r)
    b.maxY = Math.max(b.maxY, p.y + it.r)
  }
  return b
}

/** Drops the inner points of collinear runs (grid directions, so exact up to float noise). */
function simplify(pts: readonly Point[]): Point[] {
  const out: Point[] = []
  for (const p of pts) {
    const last = out.at(-1)
    if (last && Math.abs(last.x - p.x) < 1e-9 && Math.abs(last.y - p.y) < 1e-9) continue
    if (out.length >= 2) {
      const a = out[out.length - 2]!
      const b = out[out.length - 1]!
      const cr = (b.x - a.x) * (p.y - b.y) - (b.y - a.y) * (p.x - b.x)
      const dt = (b.x - a.x) * (p.x - b.x) + (b.y - a.y) * (p.y - b.y)
      if (Math.abs(cr) < 1e-9 && dt > 0) {
        out[out.length - 1] = p
        continue
      }
    }
    out.push(p)
  }
  return out
}
