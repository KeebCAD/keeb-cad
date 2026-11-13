import { Result } from '@keeb-cad/result'
import type { Anchor, Design, Frozen, Id, Rejection } from '@keeb-cad/schema'

import { anchorCycle } from '../dependencies/anchor-cycle'
import { dependencyGraph } from '../dependencies/dependency-graph'
import { reject } from '../reject/reject'
import { dependencyCycleMessage } from '../violations/dependency-cycle-message'
import { isGroup } from './node-tree'

// The node first, then the target, then the loop the new dependency would close. Removing an
// anchor can close one too: the node falls back to its parent.
export function checkSetAnchor(
  design: Frozen<Design>,
  id: Id,
  anchor: Frozen<Anchor> | undefined,
): Result<void, Rejection> {
  const graph = dependencyGraph(design.layout)
  const entry = graph.get(id)
  if (entry === undefined) {
    return Result.err(reject('unknown-target', [id], `The design has no node with the id "${id}".`))
  }
  const parent = entry.parent === undefined ? undefined : graph.get(entry.parent)
  if (parent !== undefined && isGroup(parent.node) && parent.node.arrangement === 'chain') {
    return Result.err(
      reject(
        'chain-child-anchored',
        [id],
        `The node "${id}" sits in a chain, which places it, so it takes no anchor.`,
      ),
    )
  }
  if (anchor !== undefined) {
    const target = graph.get(anchor.ref)
    const namesGroup = anchor.type === 'group'
    if (target === undefined || isGroup(target.node) !== namesGroup) {
      return Result.err(
        reject(
          'unknown-target',
          [anchor.ref],
          `The design has nothing of the right kind with the id "${anchor.ref}".`,
        ),
      )
    }
  }
  const dependency = anchor?.ref ?? entry.parent
  if (dependency === undefined) return Result.ok()
  return anchorCycle(graph, id, dependency).match<Result<void, Rejection>>({
    some: (ids) => Result.err(reject('dependency-cycle', ids, dependencyCycleMessage(ids))),
    none: () => Result.ok(),
  })
}
