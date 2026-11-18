import type { ArrangementEdit } from '@keeb-cad/model/main'
import type { Frozen, Group } from '@keeb-cad/schema'

import type { ArrangementOption } from './types'

const EDITS: Record<ArrangementOption, ArrangementEdit> = {
  free: { arrangement: 'free' },
  'chain x': { arrangement: 'chain', axis: 'x' },
  'chain y': { arrangement: 'chain', axis: 'y' },
}

export const arrangementOptions = Object.keys(EDITS) as ArrangementOption[]

export function arrangementOption(group: Frozen<Group>): ArrangementOption {
  return group.arrangement === 'chain' ? `chain ${group.axis}` : 'free'
}

export function arrangementEdit(option: ArrangementOption): ArrangementEdit {
  return EDITS[option]
}
