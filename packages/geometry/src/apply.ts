import type { Matrix, Point } from './types'

export function apply(matrix: Matrix, { x, y }: Point): Point {
  const [a, b, c, d, e, f] = matrix
  return { x: a * x + c * y + e, y: b * x + d * y + f }
}
