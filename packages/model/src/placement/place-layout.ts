import { compose, frameOf, type Matrix, translation } from '@keeb-cad/geometry'
import { InvariantError } from '@keeb-cad/result'
import {
  compareId,
  type Frozen,
  type Gap,
  type Group,
  type LayoutOutput,
  type ResolvedParts,
} from '@keeb-cad/schema'

import { sideQualifiedId } from '../ids/side-qualified-id'
import type { PlacementSide } from '../ids/types'
import { isGroup } from '../layout-editing/node-tree'
import { extent } from './extent'
import { literalValue } from './literal-value'
import { placeSlot } from './place-slot'
import { readOffset } from './read-offset'
import type {
  ArrangedNode,
  Context,
  LayoutRow,
  PlacedRectangle,
  Previous,
  SlotPart,
  Step,
} from './types'

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]
const SIDE: PlacementSide = 'left'

// The authored side's placements; the right side is derived from them.
export function placeLayout(
  layout: Frozen<Group>,
  gap: Frozen<Gap>,
  parts: ResolvedParts,
): LayoutOutput {
  const context = { gap: { x: literalValue(gap.x), y: literalValue(gap.y) }, parts }
  const frame = placeSlot(IDENTITY, readOffset(layout.offset))
  const root: ArrangedNode = {
    id: layout.id,
    kind: 'group',
    frame,
    anchor: frame,
    part: -1,
    fit: 'fitted',
  }
  const nodes = [root, ...arrangeGroup(layout, context).map((node) => inFrame(frame, node))]
  const rows = new Map(nodes.map((node) => [sideQualifiedId(SIDE, node.id), rowOf(node)]))
  const ids = [...rows.keys()].toSorted(compareId)
  return { ids, rows: ids.map((id) => rows.get(id) as LayoutRow) }
}

function arrangeGroup(group: Frozen<Group>, context: Context): ArrangedNode[] {
  const arranged: ArrangedNode[] = []
  let previous: Previous | undefined
  for (const child of group.children) {
    const below = isGroup(child) ? arrangeGroup(child, context) : []
    const own = isGroup(child) ? undefined : slotPart(child.id, context.parts)
    const rectangles: PlacedRectangle[] =
      own === undefined
        ? below.flatMap(({ frame, rectangle }) =>
            rectangle === undefined ? [] : [{ frame, ...rectangle }],
          )
        : [{ frame: IDENTITY, ...own.rectangle }]
    const stepped =
      group.arrangement === 'chain' ? step(group.axis, previous, rectangles, context) : undefined
    const anchor = stepped?.anchor ?? IDENTITY
    const frame = placeSlot(anchor, readOffset(child.offset))
    if (stepped !== undefined) previous = { frame, far: stepped.far }
    arranged.push(
      own === undefined
        ? { id: child.id, kind: 'group', frame, anchor, part: -1, fit: 'fitted' }
        : {
            id: child.id,
            kind: 'slot',
            frame,
            anchor,
            part: own.row,
            fit: own.fit,
            rectangle: own.rectangle,
          },
      ...below.map((node) => inFrame(frame, node)),
    )
  }
  return arranged
}

// Child 0 sits on the chain's frame; child n on child n−1's frame moved edge to edge along the axis.
function step(
  axis: 'x' | 'y',
  previous: Previous | undefined,
  rectangles: readonly PlacedRectangle[],
  context: Context,
): Step {
  const { near, far } = extent(rectangles, axis)
  if (previous === undefined) return { anchor: IDENTITY, far }
  const distance = previous.far + context.gap[axis] - near
  const along = axis === 'x' ? translation(distance, 0) : translation(0, distance)
  return { anchor: compose(previous.frame, along), far }
}

function slotPart(id: string, parts: ResolvedParts): SlotPart {
  const slot = parts.slots[id as keyof ResolvedParts['slots']]
  const row = slot === undefined ? -1 : parts.output.ids.indexOf(slot.run)
  const rectangle = parts.output.rows[row]
  // Parts and placement read the same layout, so every slot has a run.
  if (slot === undefined || rectangle === undefined) {
    throw new InvariantError(`The slot "${id}" has no part run to place by.`)
  }
  return { row, fit: slot.fit, rectangle }
}

function inFrame(frame: Matrix, node: ArrangedNode): ArrangedNode {
  return { ...node, frame: compose(frame, node.frame), anchor: compose(frame, node.anchor) }
}

function rowOf({ kind, frame, anchor, part, fit }: ArrangedNode): LayoutRow {
  const { x, y, rot } = frameOf(frame)
  const origin = frameOf(anchor)
  return {
    kind,
    frame: { x, y, rot, mirrored: false },
    anchorAt: { x: origin.x, y: origin.y },
    part,
    fit,
    placed: true,
  }
}
