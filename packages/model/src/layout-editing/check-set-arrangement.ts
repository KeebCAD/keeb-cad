import { Result } from '@keeb-cad/result'
import type { Design, Frozen, Id, ItemId, Rejection } from '@keeb-cad/schema'

import { addedLoop } from '../dependencies/added-loop'
import { dependencyGraph, resolvedDependencies } from '../dependencies/dependency-graph'
import { reject } from '../reject/reject'
import { dependencyCycleMessage } from '../violations/dependency-cycle-message'
import { arrangeGroup } from './arrange-group'
import { copyNodes, findNode, isGroup } from './node-tree'
import type { ArrangementEdit } from './types'

// Every id that names no group first, then the loop the edit would close: a chain child falls
// back to its previous sibling, which may depend on the group through an explicit anchor.
export function checkSetArrangement(
  design: Frozen<Design>,
  ids: readonly Id[],
  edit: Frozen<ArrangementEdit>,
): Result<void, Rejection> {
  const groups = [...new Set(ids)]
  const notGroups = groups.filter((id) => {
    const found = findNode(design.layout, id)
    return found === undefined || !isGroup(found.node)
  })
  if (notGroups.length > 0) {
    const named = notGroups.map((id) => `"${id}"`).join(', ')
    return Result.err(
      reject('unknown-target', notGroups, `The design has no group with the id ${named}.`),
    )
  }
  const edited = copyNodes(design.layout)
  for (const id of groups) {
    const found = findNode(edited, id)
    if (found !== undefined && isGroup(found.node)) arrangeGroup(found.node, edit)
  }
  return addedLoop(
    resolvedDependencies(dependencyGraph(design.layout)),
    resolvedDependencies(dependencyGraph(edited)),
  ).match<Result<void, Rejection>>({
    some: (loop) => {
      const loopIds = loop as ItemId[]
      return Result.err(
        reject('dependency-cycle', loopIds, dependencyCycleMessage(loopIds, 'nodes')),
      )
    },
    none: () => Result.ok(),
  })
}
