import type { Design, Mutable } from '@keeb-cad/schema'

import type { GapEdit } from './types'

export function setGap(design: Mutable<Design>, { x, y }: GapEdit): void {
  if (x !== undefined) design.meta.gap.x = x
  if (y !== undefined) design.meta.gap.y = y
}
