// AD-16 model shapes for Corney Island's `_pcb_outline` (story 11), and the one evaluator that
// turns them into makerjs exact paths.
//
// Shapes are data: `polygon` (vertices), `add`, `fillet` and `shape-ref` by id. A vertex is an
// anchor (a point name) plus a shift taken in the anchor's frame. A construction point is the
// intersection of two lines, each through a vertex at an angle in that vertex's anchor frame.
// Anchor poses come from Ergogen's `points.yaml`: layout is not this spike's job, and Ergogen's
// outline code is not replayed.
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
 * Evaluates shape `id` into a fresh makerjs model of exact paths (lines and arcs, Ergogen
 * frame), or the first undefined construction it depends on (then nothing depending on it is
 * built). Unions are `makerjs.model.combine` keeping each side's outside; fillets run
 * `makerjs.chain.fillet` on every chain, which leaves a corner sharp when makerjs cannot round
 * it (collinear lines).
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
