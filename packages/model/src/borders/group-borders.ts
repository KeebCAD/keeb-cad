import { growAndUnite } from '@keeb-cad/geometry'
import type { Frozen, Group, LayoutOutput, PartsOutput } from '@keeb-cad/schema'

import { sideQualifiedId } from '../ids/side-qualified-id'
import type { PlacementSide } from '../ids/types'
import { isGroup } from '../layout-editing/node-tree'
import type { LayoutRow } from '../placement/types'
import { envelopeCorners } from './envelope-corners'
import type { SlotAtLevel } from './types'

const SIDES: readonly PlacementSide[] = ['left', 'right']

// A border that fails is display only, so it posts empty and reports nothing.
export function groupBorders(
  layout: Frozen<Group>,
  placed: LayoutOutput,
  parts: PartsOutput,
  margin: number,
): LayoutOutput {
  const rowAt = new Map(placed.ids.map((id, index) => [id, index]))
  const rowOf = (id: string): LayoutRow | undefined => {
    const index = rowAt.get(id)
    return index === undefined ? undefined : placed.rows[index]
  }
  const borders = new Map<number, LayoutRow['border']>()
  for (const side of SIDES) {
    for (const group of nonRootGroups(layout)) {
      const index = rowAt.get(sideQualifiedId(side, group.id))
      if (index === undefined || placed.rows[index]?.placed !== true) continue
      const envelopes = placedSlotsUnder(group, side, rowOf).map(({ row, levels }) => ({
        envelope: envelopeCorners(row.frame, parts.rows[row.part] as PartsOutput['rows'][number]),
        distance: margin * levels,
      }))
      borders.set(index, growAndUnite(envelopes).getOr([]))
    }
  }
  return {
    ids: placed.ids,
    rows: placed.rows.map((row, index) => {
      const border = borders.get(index)
      return border === undefined ? row : { ...row, border }
    }),
  }
}

function nonRootGroups(layout: Frozen<Group>): Frozen<Group>[] {
  const groups: Frozen<Group>[] = []
  const visit = (group: Frozen<Group>) => {
    for (const child of group.children) {
      if (!isGroup(child)) continue
      groups.push(child)
      visit(child)
    }
  }
  visit(layout)
  return groups
}

// Levels follow the ownership tree, so a slot counts toward every group above it even when a
// group between them is unplaced.
function placedSlotsUnder(
  group: Frozen<Group>,
  side: PlacementSide,
  rowOf: (id: string) => LayoutRow | undefined,
  levels = 1,
): SlotAtLevel[] {
  return group.children.flatMap((child) => {
    if (isGroup(child)) return placedSlotsUnder(child, side, rowOf, levels + 1)
    const row = rowOf(sideQualifiedId(side, child.id))
    return row?.placed === true ? [{ row, levels }] : []
  })
}
