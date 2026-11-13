import type { Point } from '@keeb-cad/geometry'
import type { AttachPoint } from '@keeb-cad/schema'
import { match } from 'ts-pattern'

import type { Rectangle } from '../parts/types'

// A named point on a slot's rectangle, in the slot's own frame, y up.
export function attachPointAt(attach: AttachPoint, { w, h }: Rectangle): Point {
  return match(attach)
    .with('center', () => ({ x: 0, y: 0 }))
    .with('edge-top', () => ({ x: 0, y: h / 2 }))
    .with('edge-bottom', () => ({ x: 0, y: -h / 2 }))
    .with('edge-left', () => ({ x: -w / 2, y: 0 }))
    .with('edge-right', () => ({ x: w / 2, y: 0 }))
    .with('corner-tl', () => ({ x: -w / 2, y: h / 2 }))
    .with('corner-tr', () => ({ x: w / 2, y: h / 2 }))
    .with('corner-bl', () => ({ x: -w / 2, y: -h / 2 }))
    .with('corner-br', () => ({ x: w / 2, y: -h / 2 }))
    .exhaustive()
}
