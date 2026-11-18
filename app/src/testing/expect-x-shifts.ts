import type { LayoutOutput } from '@keeb-cad/schema'
import { expect } from 'vitest'

import { HOME_KEYS } from './home-keys'
import { xOf } from './x-of'

const DIGITS = 9

// Each home key of Corney's x chain moved by its expected shift in mm, and the undo restored the
// arranged placements.
export function expectXShifts({
  arranged,
  changed,
  undone,
  expectedShifts,
}: {
  arranged: LayoutOutput
  changed: LayoutOutput
  undone: LayoutOutput
  expectedShifts: readonly number[]
}): void {
  expect({
    shifts: HOME_KEYS.map((id) => xOf(changed, id) - xOf(arranged, id)),
    undone,
  }).toEqual({
    shifts: expectedShifts.map((shift) => expect.closeTo(shift, DIGITS)),
    undone: arranged,
  })
}
