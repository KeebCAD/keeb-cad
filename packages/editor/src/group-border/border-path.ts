import type { Point } from '../viewport/types'

export function borderPath(outer: readonly Point[]): string {
  const [first, ...rest] = outer
  return first === undefined
    ? ''
    : [`M ${first.x} ${first.y}`, ...rest.map(({ x, y }) => `L ${x} ${y}`), 'Z'].join(' ')
}
