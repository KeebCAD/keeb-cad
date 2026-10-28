// AD-16 model shapes for Corney Island's `_pcb_outline` (story 11) and LambBT's `pcb` (story 12),
// and the one evaluator that turns them into makerjs exact paths.
//
// Shapes are data: `polygon` (vertices), `add`, `fillet`, `circle` (an anchored centre and a
// radius), `subtract` and `shape-ref` by id. A vertex is an
// anchor (a point name) plus a shift taken in the anchor's frame. A construction point is the
// intersection of two lines, each through a vertex at an angle in that vertex's anchor frame.
// Corney's anchor poses come from Ergogen's `points.yaml`; LambBT's from `lambbtPoses()`, a
// transcription of Ergogen v4's column layout (no Ergogen run). Layout is not this spike's job,
// and Ergogen's outline code is not replayed.
//
// Frame: Ergogen's (mm, y up, rotation in degrees counter-clockwise). KiCad is `(x, −y)`; see
// `flatten.ts`.
import makerjs from 'makerjs'

/** An anchor pose, Ergogen frame. */
export type Pose = { x: number; y: number; r: number }

/** A point name plus a shift `[x, y]` in that point's frame (rotated by its `r`). */
export type Vertex = { anchor: string; shift?: readonly [number, number] }

/** A line through `through`, at `angle` degrees in the anchor's frame (90 = its y axis). */
export type ConstructionLine = { through: Vertex; angle: number }

/** A named point: the intersection of two lines. Its frame has `r = 0`. */
export type Construction = { id: string; kind: 'intersect'; lines: readonly [ConstructionLine, ConstructionLine] }

export type ShapeRef = { kind: 'shape-ref'; id: string }

export type Shape =
  | { id: string; kind: 'polygon'; vertices: readonly Vertex[] }
  /** Union of the parts, in order. */
  | { id: string; kind: 'add'; parts: readonly ShapeRef[] }
  /** Every corner of every chain of `of` rounded with `radius`, where makerjs can. */
  | { id: string; kind: 'fillet'; of: ShapeRef; radius: number }
  /** A full circle about an anchored centre (story 12). */
  | { id: string; kind: 'circle'; centre: Vertex; radius: number }
  /** `from` minus each of `cut`, in order (makerjs `combineSubtraction`, story 12). */
  | { id: string; kind: 'subtract'; from: ShapeRef; cut: readonly ShapeRef[] }

export type OutlineShapes = { constructions: readonly Construction[]; shapes: readonly Shape[] }

/** A construction point that does not exist (its lines are parallel), and what needed it. */
export type ConstructionUndefined = { kind: 'construction-undefined'; id: string; reason: string }

export type Evaluated = { kind: 'model'; model: makerjs.IModel } | ConstructionUndefined

/**
 * Every top-level point's `{x, y, r}` in points.yaml. A line parser, like `keysOf` in
 * `corney.ts`: a top-level `name:` opens a point, and its 4-space-indented `x`, `'y'` and `r`
 * keys (not the nested `meta`) give the pose.
 */
export function readPoints(pointsYaml: string): Map<string, Pose> {
  const poses = new Map<string, Pose>()
  let current: { name: string; pose: Partial<Pose> } | undefined
  const close = () => {
    if (!current) return
    const { x, y, r } = current.pose
    if (x === undefined || y === undefined || r === undefined) throw new Error(`points.yaml: ${current.name} lacks x, y or r`)
    poses.set(current.name, { x, y, r })
  }
  for (const line of pointsYaml.split(/\r?\n/)) {
    const top = /^([A-Za-z0-9_]+):\s*$/.exec(line)
    if (top) {
      close()
      current = { name: top[1]!, pose: {} }
      continue
    }
    const field = /^ {4}'?([xyr])'?:\s*(\S+)\s*$/.exec(line)
    if (field && current) current.pose[field[1] as keyof Pose] = Number(field[2])
  }
  close()
  return poses
}

const rad = (deg: number) => (deg * Math.PI) / 180

/** Construction points resolved so far: a pose, or why it is undefined. */
type Resolved = Map<string, Pose | ConstructionUndefined>

function poseOf(anchor: string, points: ReadonlyMap<string, Pose>, resolved: Resolved): Pose | ConstructionUndefined {
  const constructed = resolved.get(anchor)
  if (constructed) return constructed
  const pose = points.get(anchor)
  if (!pose) throw new Error(`Unknown anchor ${anchor}`)
  return pose
}

/** The vertex's position (with its anchor's frame), or the undefined construction it hangs on. */
function place(vertex: Vertex, points: ReadonlyMap<string, Pose>, resolved: Resolved): Pose | ConstructionUndefined {
  const pose = poseOf(vertex.anchor, points, resolved)
  if ('kind' in pose) return pose
  const [sx, sy] = vertex.shift ?? [0, 0]
  const c = Math.cos(rad(pose.r))
  const s = Math.sin(rad(pose.r))
  return { x: pose.x + sx * c - sy * s, y: pose.y + sx * s + sy * c, r: pose.r }
}

type DirectedLine = { x: number; y: number; dx: number; dy: number }

/** Below this |sin| between the two directions, lines count as parallel. */
const PARALLEL = 1e-9

/**
 * The construction point's pose (`r = 0`), or a typed `construction-undefined` when its lines
 * are parallel or hang on an undefined construction. Never throws for geometry.
 */
export function resolveConstruction(
  construction: Construction,
  points: ReadonlyMap<string, Pose>,
  resolved: Resolved = new Map(),
): Pose | ConstructionUndefined {
  const lines: DirectedLine[] = []
  for (const line of construction.lines) {
    const at = place(line.through, points, resolved)
    if ('kind' in at) return { kind: 'construction-undefined', id: construction.id, reason: `needs ${at.id}` }
    const angle = rad(at.r + line.angle)
    lines.push({ x: at.x, y: at.y, dx: Math.cos(angle), dy: Math.sin(angle) })
  }
  const [a, b] = lines as [DirectedLine, DirectedLine]
  const cross = a.dx * b.dy - a.dy * b.dx
  if (Math.abs(cross) < PARALLEL) {
    return { kind: 'construction-undefined', id: construction.id, reason: 'its two lines are parallel' }
  }
  // a + t·da = b + u·db, solved for t.
  const t = ((b.x - a.x) * b.dy - (b.y - a.y) * b.dx) / cross
  return { x: a.x + t * a.dx, y: a.y + t * a.dy, r: 0 }
}

/** Every construction point, in order (later ones may anchor on earlier ones). */
export function resolveConstructions(shapes: OutlineShapes, points: ReadonlyMap<string, Pose>): Resolved {
  const resolved: Resolved = new Map()
  for (const c of shapes.constructions) resolved.set(c.id, resolveConstruction(c, points, resolved))
  return resolved
}

/**
 * Evaluates shape `id` into a fresh makerjs model of exact paths (lines, arcs and circles,
 * Ergogen frame), or the first undefined construction it depends on (then nothing depending on
 * it is built). Unions are `makerjs.model.combineUnion`; subtractions `combineSubtraction`, one
 * cut at a time; a circle is a makerjs `paths.Circle`, and one a subtraction leaves whole stays
 * a circle. Fillets run `makerjs.chain.fillet` on every chain, which leaves a corner sharp when
 * makerjs cannot round it (collinear lines).
 */
export function evaluate(shapes: OutlineShapes, id: string, points: ReadonlyMap<string, Pose>): Evaluated {
  const resolved = resolveConstructions(shapes, points)
  const byId = new Map(shapes.shapes.map((s) => [s.id, s]))

  const build = (shapeId: string, stack: readonly string[]): Evaluated => {
    if (stack.includes(shapeId)) throw new Error(`Shape cycle: ${[...stack, shapeId].join(' → ')}`)
    const shape = byId.get(shapeId)
    if (!shape) throw new Error(`Unknown shape ${shapeId}`)
    const inner = [...stack, shapeId]
    switch (shape.kind) {
      case 'polygon': {
        const corners: makerjs.IPoint[] = []
        for (const vertex of shape.vertices) {
          const at = place(vertex, points, resolved)
          if ('kind' in at) return at
          corners.push([at.x, at.y])
        }
        return { kind: 'model', model: new makerjs.models.ConnectTheDots(true, corners) }
      }
      case 'add': {
        let result: makerjs.IModel | undefined
        for (const part of shape.parts) {
          const next = build(part.id, inner)
          if (next.kind !== 'model') return next
          result = result ? makerjs.model.combineUnion(result, next.model) : next.model
        }
        return { kind: 'model', model: result ?? { models: {} } }
      }
      case 'circle': {
        const at = place(shape.centre, points, resolved)
        if ('kind' in at) return at
        return { kind: 'model', model: { paths: { circle: new makerjs.paths.Circle([at.x, at.y], shape.radius) } } }
      }
      case 'subtract': {
        const base = build(shape.from.id, inner)
        if (base.kind !== 'model') return base
        let result = base.model
        for (const part of shape.cut) {
          const cut = build(part.id, inner)
          if (cut.kind !== 'model') return cut
          result = makerjs.model.combineSubtraction(result, cut.model)
        }
        return { kind: 'model', model: result }
      }
      case 'fillet': {
        const base = build(shape.of.id, inner)
        if (base.kind !== 'model') return base
        const model: makerjs.IModel = { models: { base: base.model } }
        for (const [index, chain] of (makerjs.model.findChains(base.model) as makerjs.IChain[]).entries()) {
          const fillets = makerjs.chain.fillet(chain, shape.radius)
          if (fillets) model.models![`fillet_${index}`] = fillets
        }
        return { kind: 'model', model }
      }
    }
  }
  return build(id, [])
}

/**
 * A polygon shape's vertices and a circle shape's centre, placed (Ergogen frame), without
 * makerjs: the inputs of story 12's independent reference (`circle-cut.ts`).
 */
export function placedPolygon(shapes: OutlineShapes, id: string, points: ReadonlyMap<string, Pose>): [number, number][] {
  const shape = shapes.shapes.find((s) => s.id === id)
  if (shape?.kind !== 'polygon') throw new Error(`${id} is not a polygon`)
  const resolved = resolveConstructions(shapes, points)
  return shape.vertices.map((vertex) => {
    const at = place(vertex, points, resolved)
    if ('kind' in at) throw new Error(`${id}: ${at.id} is undefined`)
    return [at.x, at.y]
  })
}

export function placedCircle(
  shapes: OutlineShapes,
  id: string,
  points: ReadonlyMap<string, Pose>,
): { centre: [number, number]; radius: number } {
  const shape = shapes.shapes.find((s) => s.id === id)
  if (shape?.kind !== 'circle') throw new Error(`${id} is not a circle`)
  const at = place(shape.centre, points, resolveConstructions(shapes, points))
  if ('kind' in at) throw new Error(`${id}: ${at.id} is undefined`)
  return { centre: [at.x, at.y], radius: shape.radius }
}

// Corney Island v0.3 (choc_v2 preset: ks = kp = 19), transcribed from
// fixtures/corney-island/source/config.yaml, `outlines:` (lines 508–620) and points 363–394.
const ks = 19
const kp = 19
const v = (anchor: string, shift?: readonly [number, number]): Vertex => (shift ? { anchor, shift } : { anchor })
const ref = (id: string): ShapeRef => ({ kind: 'shape-ref', id })
/** Ergogen's `aggregate: intersect`: the lines along each part's y axis. */
const yAxis = (anchor: string): ConstructionLine => ({ through: v(anchor), angle: 90 })

export const CORNEY_OUTLINE_SHAPES: OutlineShapes = {
  constructions: [
    { id: 'mcu_cover_bottom_left', kind: 'intersect', lines: [yAxis('mcu_cover_top_left'), yAxis('mcu_cover_bottom_right')] },
    {
      id: 'plate_additional_outline_bottom_left',
      kind: 'intersect',
      lines: [yAxis('plate_additional_outline_top'), yAxis('plate_additional_outline_bottom_right')],
    },
  ],
  shapes: [
    {
      id: '_matrix_outline',
      kind: 'polygon',
      vertices: [
        v('matrix_outer_top', [-ks * 0.47 + 0.01, kp * 0.475 - 0.015]),
        v('matrix_ring_top', [-ks * 0.47 + 0.01, kp * 0.225 - 0.014]),
        v('matrix_ring_top', [-ks * 0.47 + 0.01, kp * 0.475 - 0.015]),
        v('matrix_middle_top', [-ks * 0.47 + 0.01, kp * 0.35 - 0.015]),
        v('matrix_middle_top', [-ks * 0.47 + 0.01, kp * 0.468 - 0.005]),
        v('matrix_middle_top', [ks * 0.478, kp * 0.468 - 0.005]),
        v('matrix_middle_top', [ks * 0.478, kp * 0.35 - 0.015]),
        v('matrix_index_top', [ks * 0.478, kp * 0.475 - 0.015]),
        v('matrix_index_top', [ks * 0.478, kp * 0.34 + 0.052]),
        v('matrix_inner_top', [ks * 0.478, kp * 0.468 - 0.005]),
        v('plate_additional_outline_top'),
        v('plate_additional_outline_bottom_left'),
        v('plate_additional_outline_bottom_right'),
        v('plate_outline_bottom_4'),
        v('plate_outline_bottom_3'),
        v('plate_outline_bottom_2'),
        v('plate_outline_bottom_1'),
        v('matrix_outer_bottom', [-ks * 0.47 + 0.012, -kp * 0.485 - 0.025]),
      ],
    },
    {
      id: '_plate_additional',
      kind: 'polygon',
      vertices: [
        v('plate_additional_outline_top'),
        v('mcu_cover_top_right'),
        v('mcu_cover_bottom_right'),
        v('plate_additional_outline_bottom_right'),
        v('plate_additional_outline_bottom_left'),
      ],
    },
    { id: '_plate_outline', kind: 'add', parts: [ref('_matrix_outline'), ref('_plate_additional')] },
    {
      id: '_backplate_additional_outline',
      kind: 'polygon',
      vertices: [v('mcu_cover_top_left'), v('mcu_cover_top_right'), v('mcu_cover_bottom_right'), v('mcu_cover_bottom_left')],
    },
    { id: '_backplate_outline', kind: 'add', parts: [ref('_plate_outline'), ref('_backplate_additional_outline')] },
    { id: '_pcb_outline', kind: 'fillet', of: ref('_backplate_outline'), radius: 0.5 },
  ],
}

/** The 37-segment board outline's shape id. */
export const CORNEY_OUTLINE_ID = '_pcb_outline'

// LambBT (story 12), from `_bmad-output/layout-model/sources/lambbt.yaml` (points lines 19–103,
// `board` 149–190, `cutout_circle_small` 119–124, `pcb: [+board, -cutout_circle_small]` 349).
// No Ergogen run: the key poses come from a transcription of Ergogen v4's column layout below
// (spread, cumulative stagger, splay pushed as a rotation about its origin, every earlier
// rotation applied to later columns). Units: kx = cx = 18, ky = cy = 17, pd = 2, px = 20, py = 19.

type Rotation = { angle: number; origin: readonly [number, number] }

function rotateAbout(p: readonly [number, number], deg: number, o: readonly [number, number]): [number, number] {
  const c = Math.cos(rad(deg))
  const s = Math.sin(rad(deg))
  const dx = p[0] - o[0]
  const dy = p[1] - o[1]
  return [o[0] + dx * c - dy * s, o[1] + dx * s + dy * c]
}

/** A pose shifted by `[sx, sy]` in its own frame. */
const shifted = (pose: Pose, [sx, sy]: readonly [number, number]): Pose => {
  const c = Math.cos(rad(pose.r))
  const s = Math.sin(rad(pose.r))
  return { x: pose.x + sx * c - sy * s, y: pose.y + sx * s + sy * c, r: pose.r }
}

type ZoneColumn = { name: string; stagger?: number; splay?: number; origin?: readonly [number, number] }

/** Ergogen v4 `render_zone`, for the keys LambBT uses (no per-key orient, rotate or shift). */
function renderZone(
  zone: string,
  anchor: Pose,
  columns: readonly ZoneColumn[],
  rows: readonly string[],
  spread: number,
  padding: number,
  out: Map<string, Pose>,
): void {
  const rotations: Rotation[] = [{ angle: anchor.r, origin: [anchor.x, anchor.y] }]
  let zx = anchor.x
  let zy = anchor.y
  for (const [index, col] of columns.entries()) {
    if (index > 0) zx += spread
    zy += col.stagger ?? 0
    if (col.splay) {
      const [ox, oy] = col.origin ?? [0, 0]
      let origin: [number, number] = [zx + ox, zy + oy]
      for (const r of rotations) origin = rotateAbout(origin, r.angle, r.origin)
      rotations.push({ angle: col.splay, origin })
    }
    let p: [number, number] = [zx, zy]
    let r = 0
    for (const rot of rotations) {
      p = rotateAbout(p, rot.angle, rot.origin)
      r += rot.angle
    }
    let pose: Pose = { x: p[0], y: p[1], r }
    for (const row of rows) {
      out.set(`${zone}_${col.name}_${row}`, pose)
      pose = shifted(pose, [0, padding])
    }
  }
}

const kx = 18
const ky = 17
const pd = 2
const px = kx + pd
const py = ky + pd

/** Every LambBT key pose (Ergogen frame), plus `board_thumb_rise`, the `board` polygon's fifth vertex frame. */
export function lambbtPoses(): Map<string, Pose> {
  const poses = new Map<string, Pose>()
  renderZone(
    'matrix',
    { x: 150, y: -150, r: 0 },
    [
      { name: 'pinky', splay: 15 },
      { name: 'ring', stagger: 17, splay: -10, origin: [0, -ky] },
      { name: 'middle', stagger: 17 / 3, splay: -5, origin: [0, -ky] },
      { name: 'index', stagger: -17 / 3, splay: -5, origin: [0, -ky] },
      { name: 'inner', stagger: -17 / 6 },
    ],
    ['bottom', 'home', 'top'],
    kx,
    ky,
    poses,
  )
  renderZone(
    'thumbs',
    shifted(poses.get('matrix_inner_bottom')!, [0, -24]),
    [
      { name: 'inner', splay: -15 },
      { name: 'outer', splay: -10, origin: [-9, -9.5] },
    ],
    ['cluster'],
    kx,
    ky,
    poses,
  )
  // `[{ref: matrix_inner_top, affect: r}, {shift: [0, 2.675py]}]`: the previous vertex's
  // position with matrix_inner_top's rotation.
  const previous = shifted(poses.get('thumbs_outer_cluster')!, [0.5 * px, 0.5 * py])
  poses.set('board_thumb_rise', { x: previous.x, y: previous.y, r: poses.get('matrix_inner_top')!.r })
  return poses
}

export const LAMBBT_POSES: ReadonlyMap<string, Pose> = lambbtPoses()

/**
 * LambBT's `pcb`: `board` (its 15-vertex `stack` polygon, `fillet: 1` dropped) minus
 * `cutout_circle_small` (r = 150 at `matrix_middle_bottom` shifted `[-13, -188]`).
 */
export const LAMBBT_OUTLINE_SHAPES: OutlineShapes = {
  constructions: [],
  shapes: [
    {
      id: 'board',
      kind: 'polygon',
      vertices: [
        v('matrix_pinky_top', [-0.5 * px, 0.5 * py]),
        v('matrix_pinky_bottom', [-0.5 * px, -0.5 * py]),
        v('thumbs_outer_cluster', [0.5 * px, -0.5 * py]),
        v('thumbs_outer_cluster', [0.5 * px, 0.5 * py]),
        v('board_thumb_rise', [0, 2.675 * py]),
        v('matrix_inner_top', [0.5 * px, -0.5 * py]),
        v('matrix_inner_top', [0.5 * px, 0.5 * py]),
        v('matrix_inner_top', [-0.5 * px + pd, 0.5 * py]),
        v('matrix_index_top', [0.5 * px, 0.5 * py]),
        v('matrix_index_top', [-0.66 * px, 0.5 * py]),
        v('matrix_middle_top', [0.5 * px, 0.5 * py]),
        v('matrix_middle_top', [-0.5 * px, 0.5 * py]),
        v('matrix_ring_top', [0.64 * px, 0.5 * py]),
        v('matrix_ring_top', [-0.5 * px, 0.5 * py]),
        v('matrix_pinky_top', [0.77 * px, 0.5 * py]),
      ],
    },
    { id: 'cutout_circle_small', kind: 'circle', centre: v('matrix_middle_bottom', [-13, -188]), radius: 150 },
    { id: 'pcb', kind: 'subtract', from: ref('board'), cut: [ref('cutout_circle_small')] },
  ],
}

export const LAMBBT_OUTLINE_ID = 'pcb'
