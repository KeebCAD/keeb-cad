import { apply, compose, type Frame, type Point, rotation, translation } from '@keeb-cad/geometry'

import type { Rectangle } from '../parts/types'

// A rectangle is symmetric about its frame, so a mirrored frame gives the same four corners.
export function envelopeCorners({ x, y, rot }: Frame, { w, h }: Rectangle): Point[] {
  const placing = compose(translation(x, y), rotation(rot))
  return [
    { x: -w / 2, y: -h / 2 },
    { x: w / 2, y: -h / 2 },
    { x: w / 2, y: h / 2 },
    { x: -w / 2, y: h / 2 },
  ].map((corner) => apply(placing, corner))
}
