import { describe, expect, it } from 'vitest'
import { readPads } from '../../fixtures/src/kicad-pcb'
import { CORNEY, CORNEY_KEYS, type CorneyDesign } from './corney'
import { keyReferences, moveKey } from './move-key'
import { fixedCopperGroups, toRoutingInput, type RoutingInput } from './routing-input'
import { connectionId, naturalCompare, splitNet } from './split-rule'

const DESIGNS = Object.keys(CORNEY) as CorneyDesign[]
const inputs = Object.fromEntries(DESIGNS.map((d) => [d, toRoutingInput(CORNEY[d])])) as Record<
  CorneyDesign,
  RoutingInput
>

function padsByNet(input: RoutingInput): Map<string, string[]> {
  const byNet = new Map<string, string[]>()
  for (const p of input.pads) byNet.set(p.net, [...(byNet.get(p.net) ?? []), p.id])
  return byNet
}

function counts(input: RoutingInput) {
  const nets = padsByNet(input)
  return {
    outlineSegments: input.outline.length,
    pads: input.pads.length,
    obstacles: input.obstacles.length,
    nets: nets.size,
    singlePadNets: [...nets.values()].filter((ids) => ids.length < 2).length,
    fixedCopper: input.fixedCopper.length,
    fixedCopperConnections: input.connections.filter((c) => c.realisedBy === 'fixed-copper').length,
    connections: input.connections.length,
    keyCell: input.connections.filter((c) => c.realisedBy === 'key-cell').length,
    routing: input.connections.filter((c) => c.realisedBy === 'routing').length,
  }
}

describe('split rule', () => {
  it('sorts naturally, so D2 comes before D10', () => {
    expect(['D10.1.B', 'D2.1.B', 'D1.1.F'].sort(naturalCompare)).toEqual([
      'D1.1.F',
      'D2.1.B',
      'D10.1.B',
    ])
  })

  it('chains a net: n−1 connections, canonical ids, none for a single pad', () => {
    expect(splitNet('R0', ['S10.1.F', 'S2.1.F', 'S1.1.F'])).toEqual([
      { id: 'R0:S1.1.F~S2.1.F', net: 'R0', padA: 'S1.1.F', padB: 'S2.1.F' },
      { id: 'R0:S2.1.F~S10.1.F', net: 'R0', padA: 'S2.1.F', padB: 'S10.1.F' },
    ])
    expect(splitNet('x', ['A.1.F'])).toEqual([])
    expect(splitNet('x', [])).toEqual([])
    expect(connectionId('n', 'S10.1.F', 'S2.1.F')).toBe('n:S2.1.F~S10.1.F')
  })
})

describe('key list', () => {
  it('reads the 21 keys from points.yaml in point order', () => {
    expect(CORNEY_KEYS).toHaveLength(21)
    expect(CORNEY_KEYS[0]).toBe('matrix_outer_bottom')
    expect(CORNEY_KEYS.at(-1)).toBe('thumbfan_far_home')
  })
})

describe.each(DESIGNS)('Corney %s', (design) => {
  const input = inputs[design]

  it('fills every part and chains every net with ≥2 pads', () => {
    expect(input.outline.length).toBeGreaterThan(0)
    expect(input.pads.length).toBeGreaterThan(0)
    expect(input.fixedCopper.length).toBeGreaterThan(0)
    expect(input.netClasses.map((c) => c.name)).toEqual(['power', 'signal'])

    const byNet = padsByNet(input)
    const expected = [...byNet].flatMap(([net, ids]) => splitNet(net, ids).map((c) => c.id))
    expect(input.connections.map((c) => c.id).sort()).toEqual(expected.sort())
    for (const [net, ids] of byNet) {
      expect(input.connections.filter((c) => c.net === net)).toHaveLength(Math.max(0, ids.length - 1))
    }

    const degree = new Map<string, number>()
    for (const c of input.connections) {
      expect(c.id).toBe(connectionId(c.net, c.padA, c.padB))
      expect(naturalCompare(c.padA, c.padB)).toBeLessThan(0)
      for (const p of [c.padA, c.padB]) degree.set(p, (degree.get(p) ?? 0) + 1)
    }
    expect(Math.max(...degree.values())).toBeLessThanOrEqual(2)
    expect(new Set(input.connections.map((c) => c.id)).size).toBe(input.connections.length)
  })

  it('keeps reversible duplicates as distinct pads and NPTH holes as obstacles', () => {
    const ids = new Set(input.pads.map((p) => p.id))
    for (const id of ['S1.1.F', 'S1.1.B', 'S1.2.F', 'S1.2.B', 'MCU1.24.TH', 'MCU1.24.F', 'MCU1.24.B']) {
      expect(ids).toContain(id)
    }
    expect(input.connections.map((c) => c.id)).toContain('outer_bottom_B:S1.2.B~S1.2.F')
    expect(input.obstacles.some((o) => o.type === 'np_thru_hole')).toBe(true)
    expect(input.pads.some((p) => p.type === 'np_thru_hole')).toBe(false)
  })

  it('marks key-cell connections only within one key', () => {
    const keyCell = input.connections.filter((c) => c.realisedBy === 'key-cell')
    expect(keyCell.length).toBeGreaterThan(0)
    const keyOf = (padId: string) => {
      const m = /^([SD])(\d+)\./.exec(padId)
      if (!m) return undefined
      const n = Number(m[2])
      return m[1] === 'D' && n > CORNEY_KEYS.length ? n - CORNEY_KEYS.length : n
    }
    for (const c of keyCell) {
      expect(keyOf(c.padA), c.id).toBeDefined()
      expect(keyOf(c.padA), c.id).toBe(keyOf(c.padB))
    }
    expect(input.connections.find((c) => c.id === 'outer_bottom_B:S1.2.B~S1.2.F')?.realisedBy).toBe(
      'key-cell',
    )
    expect(input.connections.find((c) => c.id === 'C0:S1.1.F~S2.1.B')?.realisedBy).toBe('routing')
  })

  it('gives a single-pad net no connections', () => {
    expect(padsByNet(input).get('outer_bottom_F')).toHaveLength(1)
    expect(input.connections.filter((c) => c.net === 'outer_bottom_F')).toEqual([])
  })

  it('keeps the existing segments as fixed copper with width, layer and net', () => {
    expect(input.fixedCopper).toHaveLength(design === 'wired' ? 224 : 228)
    for (const t of input.fixedCopper) {
      expect(t.width).toBe(0.25)
      expect(['F.Cu', 'B.Cu']).toContain(t.layer)
    }
  })

  it('classes power nets exactly and uses 0.20 mm engine clearance', () => {
    const power = input.netClasses.find((c) => c.name === 'power')!
    const signal = input.netClasses.find((c) => c.name === 'signal')!
    expect([...power.nets].sort()).toEqual(
      design === 'wired' ? ['GND', 'RAW', 'VCC'] : ['BAT_P', 'GND', 'RAW', 'VCC'],
    )
    expect(power).toMatchObject({ traceWidth: 0.25, clearance: 0.2 })
    expect(signal).toMatchObject({ traceWidth: 0.15, clearance: 0.15 })
    expect(signal.nets.length + power.nets.length).toBe(padsByNet(input).size)
    expect(input.rules).toEqual({
      layers: ['F.Cu', 'B.Cu'],
      engineClearance: 0.2,
      boardEdgeClearance: 0.3,
      holeClearance: 0.25,
      via: { diameter: 0.56, drill: 0.3 },
    })
  })

  it('module zone: fixed copper only, no area keep-out, jumper holes are pads, joined pairs tagged', () => {
    expect(input.keepOuts).toEqual([])

    // No fixed-copper group joins pads of different nets.
    const groups = fixedCopperGroups(input.pads, input.fixedCopper)
    const netOfGroup = new Map<number, string>()
    for (const p of input.pads) {
      const g = groups.get(p.id)
      if (g === undefined) continue
      expect(p.net, p.id).toBe(netOfGroup.get(g) ?? p.net)
      netOfGroup.set(g, p.net)
    }
    expect(netOfGroup.size).toBeGreaterThan(0)
    expect(input.fixedCopper).toHaveLength(design === 'wired' ? 224 : 228)

    // Every board-net jumper hole MCU1.101–124.TH is a routable pad on a board net.
    const ids = new Map(input.pads.map((p) => [p.id, p]))
    for (let n = 101; n <= 124; n++) {
      const hole = ids.get(`MCU1.${n}.TH`)
      expect(hole, `MCU1.${n}.TH`).toBeDefined()
      expect(hole!.net).not.toMatch(/^MCU1_/)
    }

    // The jumper triples (F, B, TH copies) are joined by the pre-routed traces.
    const fixed = input.connections.filter((c) => c.realisedBy === 'fixed-copper')
    expect(fixed.length).toBeGreaterThan(0)
    const byId = new Map(input.connections.map((c) => [c.id, c.realisedBy]))
    expect(byId.get('C0:MCU1.120.B~MCU1.120.F')).toBe('fixed-copper')
    expect(byId.get('C0:MCU1.120.F~MCU1.120.TH')).toBe('fixed-copper')
    // A solder jumper is not copper, so the board net still has to be routed to the keys.
    expect(byId.get('C0:MCU1.120.TH~S1.1.B')).toBe('routing')
    // The fixed copper is module-area jumper copper only.
    for (const c of fixed) {
      expect([c.padA, c.padB].every((p) => /^(MCU1|DISP1|JST1)\./.test(p)), c.id).toBe(true)
    }
  })

  it('keeps ids and moves only the key’s pads when one key moves', () => {
    const key = 'matrix_middle_home'
    const n = CORNEY_KEYS.indexOf(key) + 1
    const delta = { dx: 1.5, dy: -0.75 }
    const moved = toRoutingInput(moveKey(CORNEY[design], key, delta))
    expect(moved.connections.map((c) => c.id)).toEqual(input.connections.map((c) => c.id))

    const refs = new Set(keyReferences(n, CORNEY_KEYS.length))
    const before = new Map(input.pads.map((p) => [p.id, p]))
    let shifted = 0
    for (const p of moved.pads) {
      const o = before.get(p.id)!
      if (refs.has(p.reference)) {
        shifted++
        expect(p.x - o.x).toBeCloseTo(delta.dx, 9)
        expect(p.y - o.y).toBeCloseTo(delta.dy, 9)
      } else {
        expect([p.x, p.y]).toEqual([o.x, o.y])
      }
    }
    expect(shifted).toBeGreaterThan(0)
    const movedRefs = new Set(
      readPads(CORNEY[design])
        .filter((p) => refs.has(p.reference))
        .map((p) => p.reference),
    )
    expect([...movedRefs].sort()).toEqual(
      design === 'wired' ? [`D${n}`, `D${n + 21}`, `LED${n}`, `S${n}`].sort() : [`D${n}`, `D${n + 21}`, `S${n}`].sort(),
    )
  })

  it('snapshots the counts', () => {
    expect(counts(input)).toMatchSnapshot()
  })
})

describe('repeated pin: wired TRRS1', () => {
  const input = inputs.wired
  it.each([
    ['2', 'GND'],
    ['3', 'DAT'],
    ['4', 'VCC'],
  ])('pin %s has two holes, both pads, linked on %s', (pin, net) => {
    const a = input.pads.find((p) => p.id === `TRRS1.${pin}.TH`)!
    const b = input.pads.find((p) => p.id === `TRRS1.${pin}.TH.2`)!
    expect(a.net).toBe(net)
    expect(b.net).toBe(net)
    expect([a.x, a.y]).not.toEqual([b.x, b.y])
    expect(input.pads.some((p) => p.id === `TRRS1.${pin}.TH.3`)).toBe(false)
    expect(input.connections.map((c) => c.id)).toContain(`${net}:TRRS1.${pin}.TH~TRRS1.${pin}.TH.2`)
  })
})

describe('repeated pad ids and errors', () => {
  it('suffixes a repeated pad id in file order instead of merging it', () => {
    const board = `(kicad_pcb (net 0 "") (net 1 "A")
      (footprint "x" (layer "F.Cu") (at 0 0) (property "Reference" "U1")
        (pad "1" smd rect (at 0 0) (size 1 1) (layers "F.Cu") (net 1 "A"))
        (pad "1" smd rect (at 2 0) (size 1 1) (layers "F.Cu") (net 1 "A"))
        (pad "1" smd rect (at 4 0) (size 1 1) (layers "F.Cu") (net 1 "A"))))`
    const input = toRoutingInput(board)
    expect(input.pads.map((p) => [p.id, p.x])).toEqual([
      ['U1.1.F', 0],
      ['U1.1.F.2', 2],
      ['U1.1.F.3', 4],
    ])
    expect(input.connections.map((c) => c.id)).toEqual(['A:U1.1.F~U1.1.F.2', 'A:U1.1.F.2~U1.1.F.3'])
  })

  it('throws on an unknown key, naming it', () => {
    expect(() => moveKey(CORNEY.wired, 'matrix_nope', { dx: 1, dy: 0 })).toThrow('Unknown key: matrix_nope')
    expect(() => moveKey(CORNEY.wireless, 'S1', { dx: 1, dy: 0 })).toThrow('Unknown key: S1')
  })
})
