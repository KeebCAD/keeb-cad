import { describe, expect, it } from 'vitest'
import { parseSexpr, readFootprintEdgeCuts, readKicadPcb } from './kicad-pcb'

describe('parseSexpr', () => {
  it('parses nested lists and bare atoms', () => {
    expect(parseSexpr('(a (b c) ((d)) e)')).toEqual(['a', ['b', 'c'], [['d']], 'e'])
  })

  it('parses quoted strings with escapes, keeping parentheses inside them', () => {
    expect(parseSexpr(String.raw`(p "a \"q\" (x)" "back\\slash" "")`)).toEqual([
      'p',
      'a "q" (x)',
      String.raw`back\slash`,
      '',
    ])
  })

  it('rejects unbalanced input and trailing content', () => {
    expect(() => parseSexpr('(a (b)')).toThrow(/not closed/)
    expect(() => parseSexpr('(a))')).toThrow(/Unbalanced/)
    expect(() => parseSexpr('(a) (b)')).toThrow(/after the expression/)
    expect(() => parseSexpr('(a "b)')).toThrow(/Unterminated/)
    expect(() => parseSexpr('  ')).toThrow(/No expression/)
  })
})

const BOARD = `(kicad_pcb
  (gr_line (start 0 0) (end 10 0) (layer Edge.Cuts) (stroke (width 0.15) (type default)))
  (gr_arc (start 10 0) (mid 11 1) (end 10 2) (layer "Edge.Cuts"))
  (gr_circle (center 5 5) (end 6.5 5) (layer Edge.Cuts) (fill none))
  (gr_line (start 0 0) (end 1 1) (layer "F.SilkS"))
  (gr_text "x" (at 0 0) (layer "Edge.Cuts"))
  (footprint "lib:switch"
    (layer "B.Cu")
    (at 100 50 180)
    (property "Reference" "S1" (at 0 8.8 180) (layer "B.SilkS"))
    (fp_rect (start -1 -1) (end 1 1) (layer "Edge.Cuts"))
    (pad "" np_thru_hole circle (at 0 0 180) (size 5 5))
    (pad "1" smd rect (at 3 -4 180) (size 2.6 2.6))
  )
  (footprint "lib:hole"
    (layer "F.Cu")
    (at 7.5 -2)
    (property "Reference" "MH1" (at 0 2.55 0))
  )
)`

describe('readKicadPcb', () => {
  it('reads top-level Edge.Cuts graphics, bare or quoted layer, ignoring other layers', () => {
    const { edgeCuts } = readKicadPcb(BOARD.replace(/\s*\(gr_text[^\n]*/, ''))
    expect(edgeCuts).toEqual([
      { kind: 'line', start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
      { kind: 'arc', start: { x: 10, y: 0 }, mid: { x: 11, y: 1 }, end: { x: 10, y: 2 } },
      { kind: 'circle', centre: { x: 5, y: 5 }, radius: 1.5 },
    ])
  })

  it('refuses an Edge.Cuts graphic it cannot read rather than dropping it', () => {
    expect(() => readKicadPcb(BOARD)).toThrow(/unsupported Edge.Cuts graphic \(gr_text/)
  })

  it('reads footprints with reference, side, pose and pad reach; rotation defaults to 0', () => {
    const { footprints } = readKicadPcb(BOARD.replace(/\s*\(gr_text[^\n]*/, ''))
    expect(footprints).toEqual([
      { reference: 'S1', library: 'lib:switch', side: 'B.Cu', x: 100, y: 50, r: 180, reach: 5 },
      { reference: 'MH1', library: 'lib:hole', side: 'F.Cu', x: 7.5, y: -2, r: 0, reach: 0 },
    ])
  })

  it('rejects a file that is not a board', () => {
    expect(() => readKicadPcb('(kicad_sch)')).toThrow(/Not a \(kicad_pcb/)
  })
})

describe('readFootprintEdgeCuts', () => {
  const board = `(kicad_pcb
    (footprint "led" (layer "F.Cu") (at 10 20 90) (property "Reference" "LED1")
      (fp_rect (start -1 -2) (end 1 2) (layer "Edge.Cuts"))
      (fp_line (start 0 0) (end 1 0) (layer "F.SilkS"))
      (fp_circle (center 0 0) (end 0.5 0) (layer "Edge.Cuts")))
    (footprint "plain" (layer "F.Cu") (at 0 0) (property "Reference" "U1")
      (fp_line (start 0 0) (end 2 0) (layer "Edge.Cuts"))))`

  it('moves footprint Edge.Cuts to world coordinates, rects as their four sides', () => {
    const cuts = readFootprintEdgeCuts(board)
    expect(cuts.map((c) => [c.reference, c.segment.kind])).toEqual([
      ['LED1', 'line'],
      ['LED1', 'line'],
      ['LED1', 'line'],
      ['LED1', 'line'],
      ['LED1', 'circle'],
      ['U1', 'line'],
    ])
    const first = cuts[0]!.segment
    if (first.kind !== 'line') throw new Error('expected a line')
    // (−1, −2) turned by 90° as readPads does (x' = x cos + y sin, y' = −x sin + y cos): (−2, 1).
    expect(first.start.x).toBeCloseTo(8, 9)
    expect(first.start.y).toBeCloseTo(21, 9)
    const circle = cuts[4]!.segment
    expect(circle).toEqual({ kind: 'circle', centre: { x: 10, y: 20 }, radius: 0.5 })
    expect(cuts[5]!.segment).toEqual({ kind: 'line', start: { x: 0, y: 0 }, end: { x: 2, y: 0 } })
  })

  it('reads footprint graphics only: the top-level outline and gr_text are left alone', () => {
    const cuts = readFootprintEdgeCuts(BOARD)
    expect(cuts.map((c) => c.reference)).toEqual(['S1', 'S1', 'S1', 'S1'])
    // S1 sits at (100, 50) turned 180°: its local (−1, −1) corner is at (101, 51).
    const first = cuts[0]!.segment
    if (first.kind !== 'line') throw new Error('expected a line')
    expect(first.start.x).toBeCloseTo(101, 9)
    expect(first.start.y).toBeCloseTo(51, 9)
  })
})
