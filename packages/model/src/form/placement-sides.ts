import type { Form } from '@keeb-cad/schema'
import { match } from 'ts-pattern'

import type { PlacementSide } from '../ids/types'
import type { PlacementSides } from './types'

// The sides a design of this form posts rows for, the authored one first.
export function placementSides(form: Form): PlacementSides {
  return match(form)
    .with({ type: 'split' }, (): PlacementSides => ['left', 'right'])
    .with({ type: 'unibody' }, (): PlacementSides => ['whole'])
    .exhaustive()
}

// The side a person edits; the Tree and the add flow, which have no side, use it.
export function authoredSide(form: Form): PlacementSide {
  return placementSides(form)[0]
}
