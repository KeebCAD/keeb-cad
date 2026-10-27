// Engine-neutral router output, and the scorecard both routers fill in the same way (R2).
// Frame and units are routing-input.ts's: KiCad's, mm, y down.
import type { Point } from '../../fixtures/src/kicad-pcb'
import {
  fixedCopperGroups,
  type CopperLayer,
  type NetClassName,
  type Realisation,
  type RoutingInput,
  type RoutingPad,
} from './routing-input'

export interface RouteTrace {
  /** The `Connection.id` this trace realises. */
  connection: string
  net: string
  layer: CopperLayer
  width: number
  /** At least two points; each consecutive pair is one KiCad `segment`. */
  points: Point[]
}

export interface RouteVia {
  at: Point
  diameter: number
  drill: number
  net: string
}

export interface RouteSet {
  traces: RouteTrace[]
  vias: RouteVia[]
}

export const EMPTY_ROUTES: RouteSet = { traces: [], vias: [] }

/**
 * The net of each fixed-copper trace, by index: its own `(net)` when the file has one, else the
 * net of the pads its fixed-copper group (story 4's union-find) reaches. Undefined for a group
 * that reaches no pad. Throws when a group reaches pads of two nets.
 */
export function fixedCopperNets(input: RoutingInput): Array<string | undefined> {
  // One zero-size probe pad on each trace's start puts the trace itself into the group map; it
  // touches only copper that already meets there, so it joins nothing new.
  const probes: RoutingPad[] = input.fixedCopper.map((t, i) => ({
    id: `fixed:${i}`,
    reference: '',
    pin: '',
    copper: t.layer === 'F.Cu' ? 'F' : 'B',
    net: '',
    type: 'smd',
    shape: 'circle',
    x: t.start.x,
    y: t.start.y,
    r: 0,
    size: { w: 0, h: 0 },
    drill: undefined,
    layers: [t.layer],
  }))
  const groups = fixedCopperGroups([...input.pads, ...probes], input.fixedCopper)
  const netOf = new Map<number, string>()
  for (const pad of input.pads) {
    const g = groups.get(pad.id)
    if (g === undefined) continue
    const seen = netOf.get(g)
    if (seen !== undefined && seen !== pad.net) {
      throw new Error(`Fixed copper joins nets ${seen} and ${pad.net} (at pad ${pad.id})`)
    }
    netOf.set(g, pad.net)
  }
  return input.fixedCopper.map((t, i) => {
    const g = groups.get(`fixed:${i}`)
    return t.net ?? (g === undefined ? undefined : netOf.get(g))
  })
}

// --- Scorecard ---------------------------------------------------------------------------

export type DrcKind = 'clearance' | 'short' | 'track-width' | 'edge-clearance' | 'hole-clearance'
/** `default` is the class of netless copper (KiCad's Default class). */
export type DrcClass = NetClassName | 'default'

export interface ConnectionCount {
  total: number
  routed: number
  /** routed / total × 100; null for `fixed-copper`, which completion leaves out. */
  completionPct: number | null
}

/** One engine's result on one design. A typed JSON file: `<engine>-<design>.scorecard.json`. */
export interface Scorecard {
  engine: { name: string; version: string }
  design: string
  /** `kicad-cli version`, which moves with system updates. */
  kicadVersion: string
  /** ISO date of the run. */
  date: string
  connections: {
    total: number
    routed: number
    /** Over `key-cell` and `routing` only. */
    completionPct: number
    byRealisation: Record<Realisation, ConnectionCount>
  }
  /** `drc` on the routed board; `added` is what the routes add over `baseline`. */
  drc: DrcCounts & { added: number }
  kicad: KicadCounts & {
    added: number
    /**
     * Types capped (at KiCad's report limit) on the bare or the routed board: their share of
     * `added` is a difference of two truncated samples, not a count.
     */
    addedUncertain?: string[]
  }
  /**
   * The bare board's own violations (wired Corney's LED pads against their cutouts), recorded
   * so a router is judged on what it adds (decision 2026-10-27). Never subtracted silently.
   */
  baseline: { drc: DrcCounts; kicad: KicadCounts }
  workerMs: number
  peakMemoryMb: number
  /** How the engine run ended; the traces it returned are scored whatever the status. */
  run?: { status: RunStatus; error: string | null; capMs: number }
  /** Scored connections (`key-cell`, `routing`) the routes do not realise, by id. */
  unrouted?: string[]
  /**
   * Clearance-family errors on the routed board that only one checker reports, as signatures
   * (`type|item|item`). Listed, never hidden (C6).
   */
  crossCheck?: { drcOnly: string[]; kicadOnly: string[] }
  /** Entries 7 and 10 only: the one-key-move reroute. */
  reroute?: {
    movedKey: string
    delta: { dx: number; dy: number }
    changedConnections: string[]
    savedRoutes: { unchanged: number; changed: number }
    /** `drc` violations that involve the module's fixed copper (`fixed:<i>` items). */
    fixedCopperViolations: number
  }
}

/** `timeout`: not solved within the cap; `failed`: the solver gave up; `threw`: it threw. */
export type RunStatus = 'solved' | 'timeout' | 'failed' | 'threw'

export interface DrcCounts {
  errors: number
  byClass: Record<DrcClass, number>
  byKind: Record<DrcKind, number>
}

export interface KicadCounts {
  /** Clearance-family violation types, by type (the only ones counted as errors). */
  clearanceFamily: Record<string, number>
  /** Every other type, unconnected items included, by type (recorded, never hidden: C6). */
  other: Record<string, number>
  /** Types at exactly KiCad's report limit (199 in 10.0.7, some types only): KiCad stopped reporting them. */
  capped: string[]
}

const zeroDrc = (): DrcCounts => ({
  errors: 0,
  byClass: { power: 0, signal: 0, default: 0 },
  byKind: { clearance: 0, short: 0, 'track-width': 0, 'edge-clearance': 0, 'hole-clearance': 0 },
})
const zeroKicad = (): KicadCounts => ({ clearanceFamily: {}, other: {}, capped: [] })

const zeroCount = (): ConnectionCount => ({ total: 0, routed: 0, completionPct: 0 })

export function emptyScorecard(engine: { name: string; version: string }, design: string): Scorecard {
  return {
    engine,
    design,
    kicadVersion: '',
    date: '',
    connections: {
      total: 0,
      routed: 0,
      completionPct: 0,
      byRealisation: {
        'key-cell': zeroCount(),
        'fixed-copper': { total: 0, routed: 0, completionPct: null },
        routing: zeroCount(),
      },
    },
    drc: { ...zeroDrc(), added: 0 },
    kicad: { ...zeroKicad(), added: 0 },
    baseline: { drc: zeroDrc(), kicad: zeroKicad() },
    workerMs: 0,
    peakMemoryMb: 0,
  }
}
