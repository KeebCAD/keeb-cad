import type { Box, Point } from '@keeb-cad/geometry'
import type { AttachPoint } from '@keeb-cad/schema'
import { match } from 'ts-pattern'

// A named point on the bounding box of a slot's slot space, in the slot's own frame, y up.
export function attachPointAt(attach: AttachPoint, { minX, minY, maxX, maxY }: Box): Point {
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  return match(attach)
    .with('center', () => ({ x: midX, y: midY }))
    .with('edge-top', () => ({ x: midX, y: maxY }))
    .with('edge-bottom', () => ({ x: midX, y: minY }))
    .with('edge-left', () => ({ x: minX, y: midY }))
    .with('edge-right', () => ({ x: maxX, y: midY }))
    .with('corner-tl', () => ({ x: minX, y: maxY }))
    .with('corner-tr', () => ({ x: maxX, y: maxY }))
    .with('corner-bl', () => ({ x: minX, y: minY }))
    .with('corner-br', () => ({ x: maxX, y: minY }))
    .exhaustive()
}
