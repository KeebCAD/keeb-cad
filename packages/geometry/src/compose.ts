import type { Matrix } from './types'

// a then b in a's frame: the result maps b's local coordinates through b, then through a.
export function compose(a: Matrix, b: Matrix): Matrix {
  const [a0, a1, a2, a3, a4, a5] = a
  const [b0, b1, b2, b3, b4, b5] = b
  return [
    a0 * b0 + a2 * b1,
    a1 * b0 + a3 * b1,
    a0 * b2 + a2 * b3,
    a1 * b2 + a3 * b3,
    a0 * b4 + a2 * b5 + a4,
    a1 * b4 + a3 * b5 + a5,
  ]
}
