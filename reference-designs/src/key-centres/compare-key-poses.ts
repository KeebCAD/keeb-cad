import { DEFAULT_TOLERANCES } from './tolerances'
import type { CandidatePose, KeyComparison, KeyDeviation, KeyPose, Tolerances } from './types'

// Absorbs float noise so a deviation of exactly the tolerance passes (inclusive).
const EPSILON = 1e-9

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

/** candidate − reference, wrapped to (−180, 180]. */
function rotationDelta(reference: number, candidate: number): number {
  const d = (((candidate - reference) % 360) + 360) % 360
  return d > 180 ? d - 360 : d
}
