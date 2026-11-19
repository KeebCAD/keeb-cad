import type { Point } from './types'

// Positive for a counter-clockwise loop (y up), negative for a clockwise one.
export function signedArea(loop: readonly Point[]): number {
  let twice = 0
  for (const [index, { x, y }] of loop.entries()) {
    const next = loop[(index + 1) % loop.length] as Point
    twice += x * next.y - next.x * y
  }
  return twice / 2
}
