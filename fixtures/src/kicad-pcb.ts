// A minimal `.kicad_pcb` reader: an s-expression parser plus extraction of the board outline
// (top-level Edge.Cuts graphics) and footprint placements. Pure: no fs, no fixture paths.
//
// Frame: KiCad's (mm, y down, rotation in degrees as written in `(at x y r)`).

/** An atom (bare or quoted, quotes and escapes resolved) or a list. */
export type Sexpr = string | Sexpr[]

export type Point = { x: number; y: number }

export type LineSegment = { kind: 'line'; start: Point; end: Point }
export type ArcSegment = { kind: 'arc'; start: Point; mid: Point; end: Point }
export type CircleSegment = { kind: 'circle'; centre: Point; radius: number }
export type Segment = LineSegment | ArcSegment | CircleSegment

export type Side = 'F.Cu' | 'B.Cu'

export type Footprint = {
  /** The `Reference` property, e.g. `S1`. */
  reference: string
  /** The footprint's library id, e.g. `ceoloide:switch_choc_v1_v2`. */
  library: string
  side: Side
  x: number
  y: number
  /** Degrees, as written; 0 when `(at x y)` omits it. */
  r: number
  /** Distance of the farthest pad from the footprint origin, mm; 0 without pads. */
  reach: number
}

export type KicadPcb = { edgeCuts: Segment[]; footprints: Footprint[] }

const ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r' }
const DELIMITERS = new Set(['(', ')', '"'])
const isSpace = (c: string) => c === ' ' || c === '\n' || c === '\t' || c === '\r'

/** Parses one s-expression; anything but whitespace after it is an error. */
export function parseSexpr(text: string): Sexpr {
  const stack: Sexpr[][] = []
  let root: Sexpr | undefined
  let i = 0

  const emit = (node: Sexpr) => {
    const top = stack.at(-1)
    if (top) top.push(node)
    else if (root === undefined) root = node
    else throw new SyntaxError(`Unexpected content after the expression at offset ${i}`)
  }

  while (i < text.length) {
    const c = text[i]!
    if (isSpace(c)) {
      i++
      continue
    }
    switch (c) {
      case '(': {
        if (stack.length === 0 && root !== undefined) {
          throw new SyntaxError(`Unexpected content after the expression at offset ${i}`)
        }
        stack.push([])
        i++
        break
      }
      case ')': {
        const list = stack.pop()
        if (!list) throw new SyntaxError(`Unbalanced ")" at offset ${i}`)
        i++
        emit(list)
        break
      }
      case '"': {
        let value = ''
        i++
        for (;;) {
          if (i >= text.length) throw new SyntaxError('Unterminated string')
          const d = text[i]!
          if (d === '"') break
          if (d === '\\') {
            const e = text[i + 1]
            if (e === undefined) throw new SyntaxError('Unterminated string')
            value += ESCAPES[e] ?? e
            i += 2
          } else {
            value += d
            i++
          }
        }
        i++
        emit(value)
        break
      }
      default: {
        const start = i
        while (i < text.length && !isSpace(text[i]!) && !DELIMITERS.has(text[i]!)) i++
        emit(text.slice(start, i))
      }
    }
  }
  if (stack.length > 0) throw new SyntaxError('Unbalanced "(": expression not closed')
  if (root === undefined) throw new SyntaxError('No expression')
  return root
}

const isList = (node: Sexpr): node is Sexpr[] => Array.isArray(node)
const head = (node: Sexpr): string | undefined =>
  isList(node) && typeof node[0] === 'string' ? node[0] : undefined

/** Direct child lists of `node` whose head is `name`. */
function children(node: Sexpr[], name: string): Sexpr[][] {
  return node.filter((child): child is Sexpr[] => head(child) === name)
}

function child(node: Sexpr[], name: string, where: string): Sexpr[] {
  const found = children(node, name)
  if (found.length !== 1) {
    throw new Error(`${where}: expected one (${name} …), found ${found.length}`)
  }
  return found[0]!
}

function num(node: Sexpr | undefined, where: string): number {
  const value = typeof node === 'string' ? Number(node) : NaN
  if (node === '' || !Number.isFinite(value)) {
    throw new Error(`${where}: expected a number, got ${JSON.stringify(node)}`)
  }
  return value
}

function str(node: Sexpr | undefined, where: string): string {
  if (typeof node !== 'string') throw new TypeError(`${where}: expected an atom`)
  return node
}

function point(node: Sexpr[], name: string, where: string): Point {
  const list = child(node, name, where)
  return { x: num(list[1], `${where} ${name}.x`), y: num(list[2], `${where} ${name}.y`) }
}

const EDGE_CUTS = 'Edge.Cuts'
const GRAPHIC = /^gr_/

function segment(node: Sexpr[], where: string): Segment {
  const kind = head(node)
  switch (kind) {
    case 'gr_line': {
      return { kind: 'line', start: point(node, 'start', where), end: point(node, 'end', where) }
    }
    case 'gr_arc': {
      return {
        kind: 'arc',
        start: point(node, 'start', where),
        mid: point(node, 'mid', where),
        end: point(node, 'end', where),
      }
    }
    case 'gr_circle': {
      const centre = point(node, 'center', where)
      const end = point(node, 'end', where)
      return { kind: 'circle', centre, radius: Math.hypot(end.x - centre.x, end.y - centre.y) }
    }
    default: {
      throw new Error(`${where}: unsupported Edge.Cuts graphic (${kind} …)`)
    }
  }
}

function footprint(node: Sexpr[], index: number): Footprint {
  let where = `footprint #${index + 1}`
  const library = str(node[1], `${where} library`)
  const reference = children(node, 'property').find((p) => p[1] === 'Reference')
  if (!reference) throw new Error(`${where} (${library}): no Reference property`)
  where = `footprint ${str(reference[2], `${where} Reference`)}`

  const side = str(child(node, 'layer', where)[1], `${where} layer`)
  if (side !== 'F.Cu' && side !== 'B.Cu') throw new Error(`${where}: unexpected layer ${side}`)

  const at = child(node, 'at', where)
  const reach = Math.max(
    0,
    ...children(node, 'pad').map((pad) => {
      const p = child(pad, 'at', `${where} pad`)
      return Math.hypot(num(p[1], `${where} pad x`), num(p[2], `${where} pad y`))
    }),
  )
  return {
    reference: str(reference[2], where),
    library,
    side,
    x: num(at[1], `${where} at.x`),
    y: num(at[2], `${where} at.y`),
    r: at[3] === undefined ? 0 : num(at[3], `${where} at.r`),
    reach,
  }
}

/** The board's Edge.Cuts graphics (top level only) and its footprints, in file order. */
export function readKicadPcb(text: string): KicadPcb {
  const root = parseSexpr(text)
  if (!isList(root) || head(root) !== 'kicad_pcb') throw new Error('Not a (kicad_pcb …) file')

  const edgeCuts: Segment[] = []
  for (const [index, node] of root.entries()) {
    const kind = head(node)
    if (!isList(node) || !kind || !GRAPHIC.test(kind)) continue
    const layer = children(node, 'layer')[0]?.[1]
    if (layer === EDGE_CUTS) edgeCuts.push(segment(node, `${kind} at item ${index}`))
  }
  const footprints = children(root, 'footprint').map((node, index) => footprint(node, index))
  return { edgeCuts, footprints }
}
