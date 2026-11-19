import type { SlotSpace } from './types'

// The app-defined stand-in run's slot space: an 18 × 18 mm rectangle centred on its frame.
export const STAND_IN_SLOT_SPACE: SlotSpace = [
  {
    outer: [
      { x: -9, y: -9 },
      { x: 9, y: -9 },
      { x: 9, y: 9 },
      { x: -9, y: 9 },
    ],
    holes: [],
  },
]
