import type { Matrix } from './types'

export function translation(x: number, y: number): Matrix {
  return [1, 0, 0, 1, x, y]
}

export function rotation(degrees: number): Matrix {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [cos, sin, -sin, cos, 0, 0]
}

export function reflectionAcrossY(): Matrix {
  return [-1, 0, 0, 1, 0, 0]
}
