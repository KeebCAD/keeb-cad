import { compose, type Matrix } from '@keeb-cad/geometry'
import { Option } from '@keeb-cad/result'
import {
  compareId,
  type Frozen,
  type Gap,
  type Group,
  type Id,
  type LayoutOutput,
  type Node,
  type ResolvedParts,
} from '@keeb-cad/schema'

import { dependencyGraph } from '../dependencies/dependency-graph'
import { dependencyOrder } from '../dependencies/dependency-order'
import { sideQualifiedId } from '../ids/side-qualified-id'
import type { PlacementSide } from '../ids/types'
import { isGroup, subtreeIds } from '../layout-editing/node-tree'
import { groupFrames } from './group-frames'
import { IDENTITY } from './identity'
import { rowOf } from './layout-row'
import { literalValue } from './literal-value'
import { placeSlot } from './place-slot'
import { readOffset } from './read-offset'
import { slotPart } from './slot-part'
import type { GroupFrames, LayoutRow, Placing, RelativeFrames } from './types'

const SIDE: PlacementSide = 'left'

// The authored side's placements; the right side is derived from them. Each group, children
// before parents, places its subtree relative to itself, so a chain step finds its siblings'
// extents ready; the root's relative frames give the world frames.
export function placeLayout(
  layout: Frozen<Group>,
  gap: Frozen<Gap>,
  parts: ResolvedParts,
  unplaced: ReadonlySet<Id>,
): LayoutOutput {
  const graph = dependencyGraph(layout)
  const placing: Placing = {
    graph,
    gap: { x: literalValue(gap.x), y: literalValue(gap.y) },
    parts,
    order: dependencyOrder(graph, unplaced),
  }
  const inRoot = framesByGroup(placing, layout).get(layout.id) as RelativeFrames
  const root = placeSlot(IDENTITY, readOffset(layout.offset))
  const inWorld = (relative: Matrix) => compose(root, relative)
  const rows = new Map<string, LayoutRow>()
  for (const [id, { node }] of graph) {
    // The root's offset is already in its own frame.
    const relative =
      id === layout.id && !unplaced.has(id)
        ? Option.some({ anchor: IDENTITY, frame: IDENTITY })
        : Option.fromNullable(inRoot.get(id))
    rows.set(
      sideQualifiedId(SIDE, id),
      rowOf(
        partFields(id, node, parts),
        relative.map(({ anchor }) => inWorld(anchor)),
        relative.map(({ frame }) => inWorld(frame)),
      ),
    )
  }
  const ids = [...rows.keys()].toSorted(compareId)
  return { ids, rows: ids.map((id) => rows.get(id) as LayoutRow) }
}

// Every group's relative frames, a group's after all of its descendant groups'.
function framesByGroup(placing: Placing, layout: Frozen<Group>): GroupFrames {
  const frames = new Map<Id, RelativeFrames>()
  const visit = (group: Frozen<Group>) => {
    for (const child of group.children) if (isGroup(child)) visit(child)
    frames.set(group.id, groupFrames(placing, group.id, new Set(subtreeIds(group)), frames))
  }
  visit(layout)
  return frames
}

function partFields(
  id: Id,
  node: Frozen<Node>,
  parts: ResolvedParts,
): Pick<LayoutRow, 'kind' | 'part' | 'fit'> {
  if (isGroup(node)) return { kind: 'group', part: -1, fit: 'fitted' }
  const { row, fit } = slotPart(id, parts)
  return { kind: 'slot', part: row, fit }
}
