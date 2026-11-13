import { frameOf, type Matrix } from '@keeb-cad/geometry'
import type { Option } from '@keeb-cad/result'

import type { LayoutRow } from './types'

const UNPLACED = { x: NaN, y: NaN, rot: NaN }

// An unplaced node keeps its part and fit, with NaN where its frame would be.
export function rowOf(
  { kind, part, fit }: Pick<LayoutRow, 'kind' | 'part' | 'fit'>,
  anchor: Option<Matrix>,
  frame: Option<Matrix>,
): LayoutRow {
  const { x, y, rot } = frame.map(frameOf).getOr(UNPLACED)
  const origin = anchor.map(frameOf).getOr(UNPLACED)
  return {
    kind,
    frame: { x, y, rot, mirrored: false },
    anchorAt: { x: origin.x, y: origin.y },
    part,
    fit,
    placed: frame.isSome(),
  }
}
