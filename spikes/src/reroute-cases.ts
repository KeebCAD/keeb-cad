// Test fixtures for the one-key-move reroute (story 7): the move, and synthetic routes. Pure.
import type { Point } from '../../fixtures/src/kicad-pcb'
import type { RouteSet, RouteTrace, RouteVia } from './route-set'
import type { RoutingInput } from './routing-input'

/** Story 4's test move, as `score:tscircuit` reroutes it. */
export const KEY = 'matrix_middle_home'
export const DELTA = { dx: 1.5, dy: -0.75 }

/**
 * Synthetic routes for `ids`: a straight F.Cu trace from padA's centre to padB's at the class
 * width, except every third connection, which goes F.Cu to a via at the midpoint, then B.Cu.
 */
export function straightRoutes(input: RoutingInput, ids: readonly string[]): RouteSet {
  const pad = new Map(input.pads.map((p) => [p.id, p]))
  const width = new Map(input.netClasses.flatMap((c) => c.nets.map((n) => [n, c.traceWidth] as const)))
  const traces: RouteTrace[] = []
  const vias: RouteVia[] = []
  for (const [k, id] of ids.entries()) {
    const c = input.connections.find((x) => x.id === id)!
    const a: Point = { x: pad.get(c.padA)!.x, y: pad.get(c.padA)!.y }
    const b: Point = { x: pad.get(c.padB)!.x, y: pad.get(c.padB)!.y }
    const w = width.get(c.net)!
    if (k % 3 === 2) {
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      traces.push({ connection: id, net: c.net, layer: 'F.Cu', width: w, points: [a, m] })
      traces.push({ connection: id, net: c.net, layer: 'B.Cu', width: w, points: [m, b] })
      vias.push({ at: m, diameter: input.rules.via.diameter, drill: input.rules.via.drill, net: c.net })
    } else traces.push({ connection: id, net: c.net, layer: 'F.Cu', width: w, points: [a, b] })
  }
  return { traces, vias }
}

