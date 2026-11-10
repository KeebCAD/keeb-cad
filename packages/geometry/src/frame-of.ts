import type { Frame, Matrix } from './types'

export function frameOf(matrix: Matrix): Frame {
  const [a, b] = matrix
  const x = matrix[4]
  const y = matrix[5]
  const rot = (Math.atan2(b, a) * 180) / Math.PI
  return { x, y, rot: rot === -180 ? 180 : rot }
}
