// Shared KiCad helpers for the Node scripts (`kicad-drc`, `score:tscircuit`): `kicad-cli` on
// PATH, its DRC run, and the signatures that match its errors to keeb-cad's `drc`.
// Node only (fs, child_process): never imported by the browser bundle or the unit tests.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { obstacleIds, type DrcViolation } from '../src/drc'
import type { Point } from '../../fixtures/src/kicad-pcb'
import { fixedCopperNets, type DrcKind, type RouteSet, type RouteTrace } from '../src/route-set'
import type { CopperLayer, RoutingInput } from '../src/routing-input'
import { pointSegment } from '../src/shapes'

export const SETUP = 'sudo pacman -S kicad'
/** The only KiCad types counted as errors (C6: every other type is recorded, never dropped). */
export const CLEARANCE_FAMILY = [
  'clearance',
  'copper_edge_clearance',
  'shorting_items',
  'tracks_crossing',
  'hole_clearance',
  'track_width',
  'via_diameter',
  'annular_width',
] as const

export interface KicadReport {
  kicad_version: string
  violations: Array<{ type: string; description: string; items: Array<{ description: string }> }>
  unconnected_items?: Array<{ type: string }>
}

export function kicadVersion(): string {
  const r = spawnSync('kicad-cli', ['version'], { encoding: 'utf8' })
  if (r.error || r.status !== 0) {
    throw new Error(
      `kicad-cli is not available on PATH (${r.error?.message ?? r.stderr.trim()}). ` +
        `Set it up with \`${SETUP}\`; the cross-check is never skipped.`,
    )
  }
  return r.stdout.trim()
}

export function count(types: string[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const t of types.sort()) m[t] = (m[t] ?? 0) + 1
  return m
}

export function runKicad(board: string, report: string): KicadReport {
  const r = spawnSync(
    'kicad-cli',
    ['pcb', 'drc', '--format', 'json', '--severity-all', '--units', 'mm', '--output', report, board],
    { encoding: 'utf8' },
  )
  if (r.error || r.status !== 0) throw new Error(`kicad-cli pcb drc failed on ${board}: ${r.error?.message ?? r.stderr}`)
  return JSON.parse(readFileSync(report, 'utf8')) as KicadReport
}

/**
 * KiCad 10.0.7 stops reporting some violation types after exactly this many (seen for
 * `copper_edge_clearance`, `hole_clearance`, `track_width`, `track_dangling`). Not every type:
 * a routed wired board reported 499 `clearance`. A type is capped only at exactly this count.
 */
export const KICAD_LIMIT = 199

/** Whether KiCad stopped reporting a type: its count is exactly `KICAD_LIMIT`. */
export const atLimit = (n: number): boolean => n === KICAD_LIMIT

/** What KiCad calls each `drc` kind. */
const KICAD_TYPE: Record<DrcKind, string> = {
  clearance: 'clearance',
  short: 'shorting_items',
  'track-width': 'track_width',
  'edge-clearance': 'copper_edge_clearance',
  'hole-clearance': 'hole_clearance',
}

/** Copper signatures both checkers can name: `pad:REF.PIN.F|B|TH`, `track:NET.LAYER`, `via:NET`. */
export function drcSignatures(input: RoutingInput, routes: RouteSet): (v: DrcViolation) => string {
  const fixed = fixedCopperNets(input)
  const sig = new Map<string, string>()
  for (const p of input.pads) sig.set(p.id, `pad:${p.reference}.${p.pin}.${p.copper}`)
  const ids = obstacleIds(input)
  for (const [i, o] of input.obstacles.entries()) {
    const copper = o.layers.length > 1 ? 'TH' : o.layers[0] === 'F.Cu' ? 'F' : 'B'
    sig.set(ids[i]!, `pad:${o.reference}.${o.pin}.${copper}`)
  }
  for (const [i, t] of input.fixedCopper.entries()) sig.set(`fixed:${i}`, `track:${fixed[i] ?? ''}.${t.layer}`)
  for (const t of routes.traces) sig.set(t.connection, `track:${t.net}.${t.layer}`)
  for (const [i, v] of routes.vias.entries()) sig.set(`via:${i}`, `via:${v.net}`)
  // A connection routed on both layers names the layer the violation is on: one every item has
  // copper on, and of those the one where its traces come nearest the violation's point.
  const traces = new Map<string, RouteTrace[]>()
  for (const t of routes.traces) traces.set(t.connection, [...(traces.get(t.connection) ?? []), t])
  const layers = new Map<string, CopperLayer[]>()
  for (const p of input.pads) layers.set(p.id, p.layers)
  for (const [i, o] of input.obstacles.entries()) layers.set(ids[i]!, o.layers)
  for (const [i, t] of input.fixedCopper.entries()) layers.set(`fixed:${i}`, [t.layer])
  for (const [i] of routes.vias.entries()) layers.set(`via:${i}`, [...input.rules.layers])
  for (const [c, ts] of traces) layers.set(c, [...new Set(ts.map((t) => t.layer))])
  const gap = (t: RouteTrace, at: Point) =>
    Math.min(...t.points.slice(1).map((p, k) => pointSegment(at, t.points[k]!, p).d)) - t.width / 2
  const near = (c: string, layer: CopperLayer, at: Point) =>
    Math.min(...traces.get(c)!.filter((t) => t.layer === layer).map((t) => gap(t, at)))
  return (v) => {
    const copper = v.items.filter((i) => !i.startsWith('edge:'))
    const split = copper.filter((i) => traces.has(i) && layers.get(i)!.length > 1)
    let layer: CopperLayer | undefined
    if (split.length > 0) {
      const shared = input.rules.layers.filter((l) => copper.every((i) => (layers.get(i) ?? [l]).includes(l)))
      const cost = (l: CopperLayer) => split.reduce((s, c) => s + near(c, l, v.at), 0)
      layer = shared.reduce<CopperLayer | undefined>((best, l) => (best === undefined || cost(l) < cost(best) ? l : best), undefined)
    }
    const items = copper.map((i) => {
      const ts = traces.get(i)
      if (layer && ts && split.includes(i)) return `track:${ts[0]!.net}.${layer}`
      return sig.get(i) ?? `?${i}`
    })
    return `${KICAD_TYPE[v.kind]}|${items.sort().join('|')}`
  }
}

export function kicadSignature(v: KicadReport['violations'][number]): string {
  const items = v.items.flatMap(({ description: d }) => {
    if (/ on Edge\.Cuts$/.test(d)) return []
    // `Pad 4 [LED_20] of LED1 on F.Cu`; through-hole: `PTH pad 1 [RST] of RST1`, `NPTH pad of MH1`.
    const pad = /^(PTH |NPTH )?[Pp]ad\s*(\S*?)\s*(?:\[.*\])?\s*of (\S+)(?: on (.+))?$/.exec(d)
    if (pad) {
      const side = pad[1] || pad[4] === undefined ? 'TH' : pad[4] === 'F.Cu' ? 'F' : pad[4] === 'B.Cu' ? 'B' : 'TH'
      return [`pad:${pad[3]}.${pad[2]}.${side}`]
    }
    const track = /^Track \[(.*?)\] on ([FB]\.Cu)/.exec(d)
    if (track) return [`track:${track[1] === '<no net>' ? '' : track[1]}.${track[2]}`]
    const via = /^Via \[(.*?)\]/.exec(d)
    if (via) return [`via:${via[1]}`]
    return [`?${d}`]
  })
  return `${v.type}|${items.sort().join('|')}`
}

/** Removes each of `take` from `from` once; returns what was taken and what was not found. */
export function takeEach(from: Map<string, number>, take: string[]): { found: string[]; missing: string[] } {
  const found: string[] = []
  const missing: string[] = []
  for (const t of take) {
    const n = from.get(t) ?? 0
    if (n > 0) {
      from.set(t, n - 1)
      found.push(t)
    } else missing.push(t)
  }
  return { found, missing }
}

export const bag = (xs: string[]) => {
  const m = new Map<string, number>()
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1)
  return m
}
