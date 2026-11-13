import { compose, frameOf, reflectionAcrossY, type Matrix } from '@keeb-cad/geometry'
import type { Option } from '@keeb-cad/result'

import type { LayoutRow } from './types'

const UNPLACED = { x: NaN, y: NaN, rot: NaN }

// An unplaced node keeps its part and fit, with NaN where its frame would be. A mirrored frame
// is read after undoing its reflection, since the canvas draws it as rotate(rot) then
// scale(-1, 1).
export function rowOf(
  { kind, part, fit }: Pick<LayoutRow, 'kind' | 'part' | 'fit'>,
  mirrored: boolean,
  anchor: Option<Matrix>,
  frame: Option<Matrix>,
): LayoutRow {
  const read = (matrix: Matrix) => frameOf(mirrored ? compose(matrix, reflectionAcrossY()) : matrix)
  const { x, y, rot } = frame.map(read).getOr(UNPLACED)
  const origin = anchor.map(read).getOr(UNPLACED)
  return {
    kind,
    frame: { x, y, rot, mirrored },
    anchorAt: { x: origin.x, y: origin.y },
    part,
    fit,
    placed: frame.isSome(),
    border: [],
  }
}
