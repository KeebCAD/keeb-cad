import { compose, type Matrix, translation } from '@keeb-cad/geometry'
import { InvariantError } from '@keeb-cad/result'
import type { Id } from '@keeb-cad/schema'
import { match } from 'ts-pattern'

import type { Dependency } from '../dependencies/types'
import { attachPointAt } from './attach-point'
import { nodeExtent } from './extent'
import { IDENTITY } from './identity'
import { placeSlot } from './place-slot'
import { readOffset } from './read-offset'
import { slotPart } from './slot-part'
import type { GroupFrames, Placing, RelativeFrame, RelativeFrames } from './types'

// The frames, relative to the group, of the nodes in its subtree placed from inside it, taken in
// dependency order so each node's dependency is ready. A node whose dependency leaves the subtree,
// and every node after it, is left out. `inner` holds each descendant group's own frames, which a
// chain step reads for its extent.
export function groupFrames(
  placing: Placing,
  group: Id,
  subtree: ReadonlySet<Id>,
  inner: GroupFrames,
): RelativeFrames {
  const frames = new Map<Id, RelativeFrame>()
  for (const id of placing.order) {
    if (id === group || !subtree.has(id)) continue
    const entry = placing.graph.get(id)
    const dependency = entry?.dependency
    // Only the root has no dependency, and no group but the root holds it.
    if (entry === undefined || dependency === undefined) {
      throw new InvariantError(`The node "${id}" depends on nothing.`)
    }
    const base = dependency.target === group ? IDENTITY : frames.get(dependency.target)?.frame
    if (base === undefined) continue
    const anchor = compose(base, moveFrom(placing, id, dependency, inner))
    frames.set(id, { anchor, frame: placeSlot(anchor, readOffset(entry.node.offset)) })
  }
  return frames
}

function moveFrom(placing: Placing, node: Id, dependency: Dependency, inner: GroupFrames): Matrix {
  return match(dependency)
    .with({ kind: 'parent' }, () => IDENTITY)
    .with({ kind: 'explicit' }, ({ target, anchor }) => {
      if (anchor.type === 'group') return IDENTITY
      const { x, y } = attachPointAt(
        anchor.attach ?? 'center',
        slotPart(target, placing.parts).rectangle,
      )
      return translation(x, y)
    })
    .with({ kind: 'previous' }, ({ target, axis }) => {
      const distance =
        nodeExtent(placing, target, axis, inner).far +
        placing.gap[axis] -
        nodeExtent(placing, node, axis, inner).near
      return axis === 'x' ? translation(distance, 0) : translation(0, distance)
    })
    .exhaustive()
}
