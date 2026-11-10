import type { Vec2 } from '../types'
import { aDelta } from './delta'

export function aVec2({ x = aDelta(), y = aDelta() }: Partial<Vec2> = {}): Vec2 {
  return { x, y }
}
