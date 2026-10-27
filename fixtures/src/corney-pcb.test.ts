import { describe, expect, it } from 'vitest'
import { loadFootprints, loadOutline, loadPlateCutouts } from './corney-pcb'
import type { Footprint, Point, Segment } from './kicad-pcb'
import {
  chainLoops,
  compareCutouts,
  compareFootprints,
  compareSegments,
  formatItemComparison,
  type Cutout,
} from './pcb-geometry'

const CUTOUT = 'matrix_middle_home'
const FOOTPRINT = 'S1'

const move = (p: Point, dx: number, dy: number): Point => ({ x: p.x + dx, y: p.y + dy })

function translate(s: Segment, dx: number, dy: number): Segment {
  if (s.kind === 'circle') return { ...s, centre: move(s.centre, dx, dy) }
  if (s.kind === 'arc') {
    return {
      ...s,
      start: move(s.start, dx, dy),
      mid: move(s.mid, dx, dy),
      end: move(s.end, dx, dy),
    }
  }
  return { ...s, start: move(s.start, dx, dy), end: move(s.end, dx, dy) }
}

function reverse(s: Segment): Segment {
  return s.kind === 'circle' ? s : { ...s, start: s.end, end: s.start }
}

const firstIndex = (segments: readonly Segment[], kind: Segment['kind']) =>
  segments.findIndex((s) => s.kind === kind)

const withCutout = (cutouts: readonly Cutout[], dx: number, dy: number) =>
  cutouts.map((c) =>
    c.name === CUTOUT ? { ...c, segments: c.segments.map((s) => translate(s, dx, dy)) } : c,
  )

const withFootprint = (
  footprints: readonly Footprint[],
  change: (fp: Footprint) => Footprint,
): Footprint[] => footprints.map((fp) => (fp.reference === FOOTPRINT ? change(fp) : fp))

/** Degrees that move the footprint's farthest pad by `mm`. */
const turnFor = (fp: Footprint, mm: number) => ((mm / fp.reach) * 180) / Math.PI

describe('chainLoops', () => {
  it('chains a degenerate arc into its neighbours rather than closing it alone', () => {
    const loops = chainLoops([
      { kind: 'line', start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
      { kind: 'arc', start: { x: 1, y: 0 }, mid: { x: 1, y: 0.0001 }, end: { x: 1, y: 0.0002 } },
      { kind: 'line', start: { x: 0, y: 1 }, end: { x: 1, y: 0.0002 } },
      { kind: 'line', start: { x: 0, y: 1 }, end: { x: 0, y: 0 } },
    ])
    expect(loops.map((loop) => loop.length)).toEqual([4])
  })

  it('throws on an open chain', () => {
    expect(() =>
      chainLoops([
        { kind: 'line', start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
        { kind: 'line', start: { x: 1, y: 0 }, end: { x: 1, y: 1 } },
      ]),
    ).toThrow(/Open chain/)
  })
})

describe('Corney Island plate cutouts (shared by wired and wireless)', () => {
  const cutouts = loadPlateCutouts()

  it('holds 21 switch cutouts named by key and 5 screw holes', () => {
    expect(cutouts).toHaveLength(26)
    const switches = cutouts.filter((c) => c.segments.length === 4)
    expect(switches).toHaveLength(21)
    expect(switches.every((c) => /^(matrix|thumbfan)_/.test(c.name))).toBe(true)
    const holes = cutouts.filter((c) => c.segments.length === 1)
    expect(holes).toHaveLength(5)
    expect(holes.every((c) => c.segments[0]?.kind === 'circle')).toBe(true)
    expect(holes.every((c) => c.name.startsWith('screw_pcb_'))).toBe(true)
    expect(new Set(cutouts.map((c) => c.name)).size).toBe(26)
  })

  it('passes against itself', () => {
    const result = compareCutouts(cutouts, cutouts)
    expect(result.pass, formatItemComparison(result)).toBe(true)
    expect(result.items).toHaveLength(26)
  })

  it('fails a cutout moved 0.06 mm, naming it by key', () => {
    const result = compareCutouts(cutouts, withCutout(cutouts, 0.06, 0))
    expect(result.pass).toBe(false)
    expect(result.items.filter((i) => !i.pass).map((i) => i.name)).toEqual([CUTOUT])
    const message = formatItemComparison(result)
    expect(message).toContain(`FAIL ${CUTOUT}: 0.0600 mm`)
    expect(message).toContain(`failing: ${CUTOUT}`)
  })

  it('passes a cutout moved exactly 0.05 mm', () => {
    const result = compareCutouts(cutouts, withCutout(cutouts, 0.03, -0.04))
    expect(result.pass, formatItemComparison(result)).toBe(true)
  })

  it('passes cutouts given in another order with reversed segments', () => {
    const candidate = cutouts.toReversed().map((c) => ({ segments: c.segments.map(reverse) }))
    const result = compareCutouts(cutouts, candidate)
    expect(result.pass, formatItemComparison(result)).toBe(true)
  })

  it('fails missing, extra and duplicate cutouts, naming each', () => {
    const dropped = compareCutouts(
      cutouts,
      cutouts.filter((c) => c.name !== CUTOUT),
    )
    expect(dropped.pass).toBe(false)
    expect(dropped.missing).toEqual([CUTOUT])
    expect(formatItemComparison(dropped)).toContain(`missing: ${CUTOUT}`)

    const square: Segment[] = [
      { kind: 'line', start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
      { kind: 'line', start: { x: 1, y: 0 }, end: { x: 1, y: 1 } },
      { kind: 'line', start: { x: 1, y: 1 }, end: { x: 0, y: 1 } },
      { kind: 'line', start: { x: 0, y: 1 }, end: { x: 0, y: 0 } },
    ]
    const added = compareCutouts(cutouts, [...cutouts, { segments: square }])
    expect(added.pass).toBe(false)
    expect(added.extra).toEqual(['candidate cutout at (0.500, 0.500)'])
    expect(formatItemComparison(added)).toContain('extra: candidate cutout at (0.500, 0.500)')

    const twice = compareCutouts(cutouts, [...cutouts, cutouts.find((c) => c.name === CUTOUT)!])
    expect(twice.pass).toBe(false)
    expect(twice.duplicate).toEqual([CUTOUT])
  })
})

describe.each(['wired', 'wireless'] as const)('Corney Island %s board', (design) => {
  const outline = loadOutline(design)
  const footprints = loadFootprints(design)

  describe('outline', () => {
    it('holds the 19 lines and 18 arcs of the PCB outline', () => {
      expect(outline.filter((s) => s.kind === 'line')).toHaveLength(19)
      expect(outline.filter((s) => s.kind === 'arc')).toHaveLength(18)
      expect(outline).toHaveLength(37)
    })

    it('passes against itself', () => {
      const result = compareSegments(outline, outline)
      expect(result.pass, formatItemComparison(result)).toBe(true)
      expect(result.items).toHaveLength(37)
    })

    it('fails a line whose endpoint moved 0.06 mm, naming only that segment', () => {
      const index = firstIndex(outline, 'line')
      const line = outline[index]!
      const candidate = outline.map((s, i) =>
        i === index && s.kind === 'line' ? { ...s, end: move(s.end, 0, 0.06) } : s,
      )
      const result = compareSegments(outline, candidate)
      expect(result.pass).toBe(false)
      const failing = result.items.filter((i) => !i.pass)
      expect(failing).toHaveLength(1)
      const name = `outline line #1 at (${line.kind === 'line' && line.start.x.toFixed(3)}, ${
        line.kind === 'line' && line.start.y.toFixed(3)
      })`
      expect(failing[0]?.name).toBe(name)
      expect(formatItemComparison(result)).toContain(`FAIL ${name}: 0.0600 mm`)
    })

    it('fails an arc whose mid moved 0.06 mm', () => {
      const index = firstIndex(outline, 'arc')
      const candidate = outline.map((s, i) =>
        i === index && s.kind === 'arc' ? { ...s, mid: move(s.mid, -0.06, 0) } : s,
      )
      const result = compareSegments(outline, candidate)
      expect(result.pass).toBe(false)
      expect(result.items.filter((i) => !i.pass).map((i) => i.name)).toEqual([
        expect.stringMatching(/^outline arc #1 at /),
      ])
    })

    it('passes a segment moved exactly 0.05 mm', () => {
      const index = firstIndex(outline, 'arc')
      const candidate = outline.map((s, i) => (i === index ? translate(s, 0.03, 0.04) : s))
      const result = compareSegments(outline, candidate)
      expect(result.pass, formatItemComparison(result)).toBe(true)
    })

    it('passes segments reversed and reordered', () => {
      const result = compareSegments(outline, outline.toReversed().map(reverse))
      expect(result.pass, formatItemComparison(result)).toBe(true)
    })

    it('fails missing and extra segments, naming each', () => {
      const index = firstIndex(outline, 'arc')
      const dropped = compareSegments(
        outline,
        outline.filter((_, i) => i !== index),
      )
      expect(dropped.pass).toBe(false)
      expect(dropped.missing).toEqual([expect.stringMatching(/^outline arc #1 at /)])

      const stray: Segment = { kind: 'line', start: { x: 0, y: 0 }, end: { x: 1, y: 0 } }
      const added = compareSegments(outline, [...outline, stray])
      expect(added.pass).toBe(false)
      expect(added.extra).toEqual(['candidate line #20 at (0.000, 0.000)'])
      expect(formatItemComparison(added)).toContain('extra: candidate line #20 at (0.000, 0.000)')

      const line = outline[firstIndex(outline, 'line')]!
      const anchor = line.kind === 'line' ? line.start : { x: NaN, y: NaN }
      const name = `candidate line #20 at (${anchor.x.toFixed(3)}, ${anchor.y.toFixed(3)})`
      const twice = compareSegments(outline, [...outline, line])
      expect(twice.pass).toBe(false)
      expect(twice.duplicate).toEqual([name])
      expect(formatItemComparison(twice)).toContain(`duplicate: ${name}`)
    })
  })

  describe('footprints', () => {
    const expected = design === 'wired' ? 101 : 75

    it(`holds ${expected} footprints with unique references`, () => {
      expect(footprints).toHaveLength(expected)
      expect(new Set(footprints.map((fp) => fp.reference)).size).toBe(expected)
      expect(footprints.find((fp) => fp.reference === FOOTPRINT)).toMatchObject({
        library: 'ceoloide:switch_choc_v1_v2',
        side: 'B.Cu',
        x: 100,
        y: 100,
        r: 180,
      })
    })

    it('passes against itself', () => {
      const result = compareFootprints(footprints, footprints)
      expect(result.pass, formatItemComparison(result)).toBe(true)
      expect(result.items).toHaveLength(expected)
    })

    it(`fails ${FOOTPRINT} moved 0.06 mm, naming it`, () => {
      const result = compareFootprints(
        footprints,
        withFootprint(footprints, (fp) => ({ ...fp, x: fp.x + 0.06 })),
      )
      expect(result.pass).toBe(false)
      expect(result.items.filter((i) => !i.pass).map((i) => i.name)).toEqual([FOOTPRINT])
      const message = formatItemComparison(result)
      expect(message).toContain(`FAIL ${FOOTPRINT}: 0.0600 mm (position 0.0600 mm`)
      expect(message).toContain(`failing: ${FOOTPRINT}`)
    })

    it(`fails ${FOOTPRINT} rotated so its farthest pad moves 0.06 mm, naming it`, () => {
      const result = compareFootprints(
        footprints,
        withFootprint(footprints, (fp) => ({ ...fp, r: fp.r + turnFor(fp, 0.06) })),
      )
      expect(result.pass).toBe(false)
      expect(result.items.filter((i) => !i.pass).map((i) => i.name)).toEqual([FOOTPRINT])
      expect(formatItemComparison(result)).toContain(`FAIL ${FOOTPRINT}: 0.0600 mm`)
    })

    it(`passes ${FOOTPRINT} moved or rotated exactly 0.05 mm, and rotation modulo 360`, () => {
      const moved = compareFootprints(
        footprints,
        withFootprint(footprints, (fp) => ({ ...fp, x: fp.x + 0.03, y: fp.y - 0.04 })),
      )
      expect(moved.pass, formatItemComparison(moved)).toBe(true)
      const turned = compareFootprints(
        footprints,
        withFootprint(footprints, (fp) => ({ ...fp, r: fp.r - 360 - turnFor(fp, 0.05) })),
      )
      expect(turned.pass, formatItemComparison(turned)).toBe(true)
    })

    it(`fails ${FOOTPRINT} on the other side, naming it`, () => {
      const result = compareFootprints(
        footprints,
        withFootprint(footprints, (fp) => ({ ...fp, side: 'F.Cu' })),
      )
      expect(result.pass).toBe(false)
      expect(formatItemComparison(result)).toContain(`failing: ${FOOTPRINT}`)
    })

    it('fails missing, extra and duplicate footprints, naming each', () => {
      const s1 = footprints.find((fp) => fp.reference === FOOTPRINT)!
      const result = compareFootprints(footprints, [
        ...footprints.filter((fp) => fp.reference !== FOOTPRINT),
        { ...s1, reference: 'S99' },
        footprints.find((fp) => fp.reference === 'MH1')!,
      ])
      expect(result.pass).toBe(false)
      expect(result.missing).toEqual([FOOTPRINT])
      expect(result.extra).toEqual(['S99'])
      expect(result.duplicate).toEqual(['MH1'])
      const message = formatItemComparison(result)
      expect(message).toContain(`missing: ${FOOTPRINT}`)
      expect(message).toContain('extra: S99')
      expect(message).toContain('duplicate: MH1')
    })
  })
})
