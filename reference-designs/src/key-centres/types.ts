export type Variant = 'wired' | 'wireless'

/** A key's centre and rotation in Ergogen's frame (mm, y up), with its keycap size (used for the rotation tolerance). */
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

export type ErgogenPoint = { x: number; y: number; r: number; meta?: { tags?: unknown } }
