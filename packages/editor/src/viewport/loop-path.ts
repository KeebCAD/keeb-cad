import type { Point } from './types'

export function loopPath(loop: readonly Point[]): string {
  const [first, ...rest] = loop
  return first === undefined
    ? ''
    : [`M ${first.x} ${first.y}`, ...rest.map(({ x, y }) => `L ${x} ${y}`), 'Z'].join(' ')
}
