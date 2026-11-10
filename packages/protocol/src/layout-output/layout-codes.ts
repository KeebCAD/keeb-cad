import type { LayoutRow } from './types'

// Each code is its option's index in schema's picklist, so the schema's order is the one order.
export const kindCodes: Record<LayoutRow['kind'], number> = { slot: 0, group: 1 }

export const fitCodes: Record<LayoutRow['fit'], number> = { fitted: 0, empty: 1, 'stand-in': 2 }
