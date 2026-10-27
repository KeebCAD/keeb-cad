import { describe, expect, it } from 'vitest'
import { parseSexpr, readKicadPcb } from './kicad-pcb'

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
