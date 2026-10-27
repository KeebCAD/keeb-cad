// RouteSet → KiCad: the routed `.kicad_pcb` (text-additive) and the `.kicad_pro` and `.kicad_dru`
// beside it, so KiCad checks the same rules as `drc`. Pure: text in, text out.
import { parseSexpr, type Point } from '../../fixtures/src/kicad-pcb'
import type { RoutingInput } from './routing-input'
import { fixedCopperNets, type RouteSet } from './route-set'
import { childLists, closeOf } from './sexpr-text'

/** A number as KiCad writes it: fixed point, no exponent, no trailing zeros. */
export function fmt(v: number): string {
  if (!Number.isFinite(v)) throw new Error(`Not a finite number: ${v}`)
  const s = v.toFixed(6).replace(/\.?0+$/, '')
  return s === '-0' ? '0' : s
}

const pt = (p: Point) => `${fmt(p.x)} ${fmt(p.y)}`

/** The board's top-level `(net N "name")` table, name → number. */
export function netTable(pcbText: string): Map<string, string> {
  const root = parseSexpr(pcbText)
  if (!Array.isArray(root) || root[0] !== 'kicad_pcb') throw new Error('Not a (kicad_pcb …) file')
  const table = new Map<string, string>()
  for (const n of root) {
    if (Array.isArray(n) && n[0] === 'net' && typeof n[1] === 'string' && typeof n[2] === 'string') {
      table.set(n[2], n[1])
    }
  }
  return table
}

/**
 * `pcbText` with `routes` appended as `segment` and `via` nodes before the final `)`, each with
 * its net number from the board's net table, and a `(net N)` added to each netless pre-routed
 * segment (no `(net)`, or `(net 0)`, which it replaces) from its fixed-copper group. No other byte changes. Throws on a net not in the board.
 */
export function writeRoutes(pcbText: string, input: RoutingInput, routes: RouteSet): string {
  const table = netTable(pcbText)
  const number = (net: string, what: string) => {
    const n = table.get(net)
    if (n === undefined) throw new Error(`Unknown net ${JSON.stringify(net)} (${what}): not in the board's net table`)
    return n
  }

  const added: string[] = []
  for (const t of routes.traces) {
    if (t.points.length < 2) throw new Error(`Trace of ${t.connection}: fewer than two points`)
    const n = number(t.net, `trace of ${t.connection}`)
    for (let k = 1; k < t.points.length; k++) {
      added.push(
        `  (segment (start ${pt(t.points[k - 1]!)}) (end ${pt(t.points[k]!)}) (width ${fmt(t.width)}) (layer "${t.layer}") (net ${n}))`,
      )
    }
  }
  for (const [i, v] of routes.vias.entries()) {
    const n = number(v.net, `via ${i}`)
    added.push(
      `  (via (at ${pt(v.at)}) (size ${fmt(v.diameter)}) (drill ${fmt(v.drill)}) (layers "F.Cu" "B.Cu") (net ${n}))`,
    )
  }

  // Nets for the netless pre-routed segments, in file order (the order of input.fixedCopper).
  const nets = fixedCopperNets(input)
  const root = pcbText.indexOf('(')
  const close = closeOf(pcbText, root)
  const edits: Array<{ start: number; end: number; text: string }> = []
  let i = 0
  for (const [start, end] of childLists(pcbText, root, close)) {
    if (!/^\(segment[\s)]/.test(pcbText.slice(start, start + 9))) continue
    const net = nets[i]
    const t = input.fixedCopper[i]
    if (!t) throw new Error('The board has more segments than the routing input')
    i++
    const netNode = [...childLists(pcbText, start, end)].find(([s]) => /^\(net\s/.test(pcbText.slice(s, s + 5)))
    // `(net 0)` (or `(net 0 "")`) is KiCad's no-net, so it is netless too and gets the group net.
    const netless = !netNode || /^\(net\s+0(\s+""\s*)?\)$/.test(pcbText.slice(netNode[0], netNode[1]))
    if (!netless || net === undefined) continue
    const text = `(net ${number(net, `pre-routed segment ${i - 1}`)})`
    if (netNode) edits.push({ start: netNode[0], end: netNode[1], text })
    else edits.push({ start: end - 1, end: end - 1, text: ` ${text}` })
  }
  if (i !== input.fixedCopper.length) throw new Error('The board has fewer segments than the routing input')

  let out = pcbText.slice(0, close - 1)
  if (added.length > 0) out = out.replace(/\s*$/, '\n') + added.join('\n') + '\n'
  out += pcbText.slice(close - 1)
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end)
  return out
}

/**
 * The `.kicad_pro` (JSON) for a board of `input`: Default plus the power and signal classes with
 * their nets, the via size and the board-edge clearance. Default (netless copper only) takes the
 * strictest clearance, as `drc` does.
 */
export function writeProject(input: RoutingInput, stem: string): string {
  const { via, engineClearance, boardEdgeClearance } = input.rules
  const netClass = (name: string, clearance: number, trackWidth: number, priority: number) => ({
    name,
    clearance,
    track_width: trackWidth,
    via_diameter: via.diameter,
    via_drill: via.drill,
    microvia_diameter: 0.3,
    microvia_drill: 0.1,
    diff_pair_gap: 0.25,
    diff_pair_via_gap: 0.25,
    diff_pair_width: 0.2,
    wire_width: 6,
    bus_width: 12,
    line_style: 0,
    pcb_color: 'rgba(0, 0, 0, 0.000)',
    schematic_color: 'rgba(0, 0, 0, 0.000)',
    priority,
  })
  const minWidth = Math.min(...input.netClasses.map((c) => c.traceWidth))
  const project = {
    board: {
      design_settings: {
        defaults: {},
        diff_pair_dimensions: [],
        drc_exclusions: [],
        rules: {
          min_copper_edge_clearance: boardEdgeClearance,
          min_hole_clearance: input.rules.holeClearance,
          min_track_width: minWidth,
          min_via_diameter: via.diameter,
          min_through_hole_diameter: via.drill,
        },
        track_widths: [],
        via_dimensions: [],
      },
    },
    boards: [],
    libraries: { pinned_footprint_libs: [], pinned_symbol_libs: [] },
    meta: { filename: `${stem}.kicad_pro`, version: 3 },
    net_settings: {
      classes: [
        netClass('Default', engineClearance, minWidth, 2147483647),
        ...input.netClasses.map((c, i) => netClass(c.name, c.clearance, c.traceWidth, i)),
      ],
      meta: { version: 4 },
      net_colors: null,
      netclass_assignments: null,
      netclass_patterns: input.netClasses.flatMap((c) =>
        [...c.nets].sort().map((n) => ({ netclass: c.name, pattern: n })),
      ),
    },
    pcbnew: { page_layout_descr_file: '' },
    sheets: [],
    text_variables: {},
  }
  return JSON.stringify(project, null, 2) + '\n'
}

/**
 * The `.kicad_dru` custom rules: a minimum track width per class. KiCad's net-class track width is
 * only a routing default, not a DRC limit, so without this KiCad would not check what `drc` does.
 */
export function writeRules(input: RoutingInput): string {
  const rules = input.netClasses.map(
    (c) =>
      `(rule "${c.name}_track_width"\n  (condition "A.NetClass == '${c.name}'")\n  (constraint track_width (min ${fmt(c.traceWidth)}mm)))`,
  )
  return `(version 1)\n${rules.join('\n')}\n`
}
