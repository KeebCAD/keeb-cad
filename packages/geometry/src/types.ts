// A 2D affine matrix [a, b, c, d, e, f], mapping (x, y) to (a·x + c·y + e, b·x + d·y + f).
export type Matrix = readonly [number, number, number, number, number, number]

// A position and a rotation in degrees, counter-clockwise positive, in (−180, 180].
export interface Frame {
  x: number
  y: number
  rot: number
}

export interface Point {
  x: number
  y: number
}
