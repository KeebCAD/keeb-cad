// Golden key poses for Corney Island v0.3, read from the committed Ergogen output, and a
// comparison that reports every key's deviation from them. Data to data: a layout engine
// plugs in as `compareKeyPoses(loadKeyPoses('wired'), engineKeys)`.
//
// Frame: Ergogen's (mm, y up, r in degrees counter-clockwise). Callers convert.
import { existsSync } from 'node:fs'
import { FIXTURE_DIR, readYaml } from './fixture-files'

export type Design = 'wired' | 'wireless'

/** A key's centre and rotation, with its keycap size (used for the rotation tolerance). */
export type KeyPose = {
  name: string
  x: number
  y: number
  /** Degrees, counter-clockwise. */
  r: number
  /** Keycap width, mm. */
  width: number
  /** Keycap height, mm. */
  height: number
}

/** A candidate pose. Sizes are optional: the rotation tolerance uses the reference's. */
export type CandidatePose = Pick<KeyPose, 'name' | 'x' | 'y' | 'r'> & Partial<KeyPose>

export type Tolerances = {
  /** Max Euclidean centre distance, mm, inclusive. */
  position: number
  /** Max keycap corner displacement from rotation, |Δr| (rad) × half-diagonal, mm, inclusive. */
  rotation: number
}

export const DEFAULT_TOLERANCES: Tolerances = { position: 0.05, rotation: 0.05 }

export type KeyDeviation = {
  name: string
  /** Euclidean centre distance, mm. */
  position: number
  /** Signed rotation difference candidate − reference, degrees, in (−180, 180]. */
  rotationDeg: number
  /** Keycap corner displacement caused by the rotation difference, mm. */
  rotation: number
  pass: boolean
}

export type KeyComparison = {
  pass: boolean
  tolerances: Tolerances
  /** One entry per reference key the candidate also has, in reference order. */
  keys: KeyDeviation[]
  /** Reference keys the candidate lacks. */
  missing: string[]
  /** Candidate keys the reference lacks. */
  extra: string[]
  /** Candidate names given more than once. */
  duplicate: string[]
}

/** Both designs share one `points`; they differ only in the PCB Ergogen emits. */
export const DESIGN_PCB: Record<Design, string> = {
  wired: 'pcbs/corney_island.kicad_pcb',
  wireless: 'pcbs/corney_island_wireless.kicad_pcb',
}

const KEY_TAG = 'key'
const WIDE_TAG = 'key_1_5u'
// From the config's `_keycap_outlines`: `key` is keycw × keych, `key_1_5u` is keycw*1.5 × keych.
const WIDE_FACTOR = 1.5
// Absorbs float noise so a deviation of exactly the tolerance passes (inclusive).
const EPSILON = 1e-9

type ErgogenPoint = { x: number; y: number; r: number; meta?: { tags?: unknown } }

function tagsOf(point: ErgogenPoint): string[] {
  const tags = point.meta?.tags
  if (typeof tags === 'string') return [tags]
  if (Array.isArray(tags)) return tags.filter((t): t is string => typeof t === 'string')
  if (tags && typeof tags === 'object') {
    return Object.entries(tags)
      .filter(([, on]) => on)
      .map(([tag]) => tag)
  }
  return []
}

function unit(units: Record<string, unknown>, name: string): number {
  const value = units[name]
  if (typeof value !== 'number') throw new TypeError(`Ergogen units lack numeric "${name}"`)
  return value
}

/** The fixture's key poses for a design: points tagged `key`, helpers excluded. */
export function loadKeyPoses(design: Design): KeyPose[] {
  const pcb = new URL(DESIGN_PCB[design], FIXTURE_DIR)
  if (!existsSync(pcb)) throw new Error(`Fixture for "${design}" lacks ${DESIGN_PCB[design]}`)

  const units = readYaml('points/units.yaml') as Record<string, unknown>
  const keycw = unit(units, 'keycw')
  const keych = unit(units, 'keych')
  const points = readYaml('points/points.yaml') as Record<string, ErgogenPoint>

  return Object.entries(points)
    .filter(([, point]) => tagsOf(point).includes(KEY_TAG))
    .map(([name, point]) => {
      const wide = tagsOf(point).includes(WIDE_TAG)
      return {
        name,
        x: point.x,
        y: point.y,
        r: point.r,
        width: wide ? keycw * WIDE_FACTOR : keycw,
        height: keych,
      }
    })
}

/** candidate − reference, wrapped to (−180, 180]. */
function rotationDelta(reference: number, candidate: number): number {
  const d = (((candidate - reference) % 360) + 360) % 360
  return d > 180 ? d - 360 : d
}

/** Compares a candidate set against reference poses, key by key. */
export function compareKeyPoses(
  reference: readonly KeyPose[],
  candidate: readonly CandidatePose[],
  tolerances: Partial<Tolerances> = {},
): KeyComparison {
  const tol = { ...DEFAULT_TOLERANCES, ...tolerances }
  const byName = new Map<string, CandidatePose>()
  const duplicate = new Set<string>()
  for (const pose of candidate) {
    if (byName.has(pose.name)) duplicate.add(pose.name)
    else byName.set(pose.name, pose)
  }
  const referenceNames = new Set(reference.map((k) => k.name))

  const keys: KeyDeviation[] = []
  const missing: string[] = []
  for (const ref of reference) {
    const cand = byName.get(ref.name)
    if (!cand) {
      missing.push(ref.name)
      continue
    }
    const position = Math.hypot(cand.x - ref.x, cand.y - ref.y)
    const rotationDeg = rotationDelta(ref.r, cand.r)
    const rotation =
      Math.abs((rotationDeg * Math.PI) / 180) * (Math.hypot(ref.width, ref.height) / 2)
    keys.push({
      name: ref.name,
      position,
      rotationDeg,
      rotation,
      pass: position <= tol.position + EPSILON && rotation <= tol.rotation + EPSILON,
    })
  }
  const extra = [...byName.keys()].filter((name) => !referenceNames.has(name))

  return {
    pass:
      keys.every((k) => k.pass) &&
      missing.length === 0 &&
      extra.length === 0 &&
      duplicate.size === 0,
    tolerances: tol,
    keys,
    missing,
    extra,
    duplicate: [...duplicate],
  }
}

const mm = (n: number) => `${n.toFixed(4)} mm`

/** Every key's deviation, then every failing, missing, extra and duplicate key by name. */
export function formatKeyComparison(result: KeyComparison): string {
  const { tolerances: tol } = result
  const failing = result.keys.filter((k) => !k.pass)
  const lines = [
    `${result.pass ? 'PASS' : 'FAIL'}: ${result.keys.length} keys compared ` +
      `(position ≤ ${mm(tol.position)}, rotation ≤ ${mm(tol.rotation)})`,
    ...result.keys.map(
      (k) =>
        `  ${k.pass ? 'ok  ' : 'FAIL'} ${k.name}: position ${mm(k.position)}, ` +
        `rotation ${k.rotationDeg.toFixed(4)}° = ${mm(k.rotation)}`,
    ),
  ]
  if (failing.length > 0) lines.push(`failing: ${failing.map((k) => k.name).join(', ')}`)
  if (result.missing.length > 0) lines.push(`missing: ${result.missing.join(', ')}`)
  if (result.extra.length > 0) lines.push(`extra: ${result.extra.join(', ')}`)
  if (result.duplicate.length > 0) lines.push(`duplicate: ${result.duplicate.join(', ')}`)
  return lines.join('\n')
}
