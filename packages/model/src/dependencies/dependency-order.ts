import type { Id } from '@keeb-cad/schema'

import { resolvedDependency } from './dependency-graph'
import type { DependencyGraph } from './types'

// The placed nodes, each after the node it depends on. Unplaced nodes are left out, which leaves
// the graph acyclic.
export function dependencyOrder(graph: DependencyGraph, unplaced: ReadonlySet<Id>): Id[] {
  const order: Id[] = []
  const visited = new Set<Id>(unplaced)
  for (const start of graph.keys()) {
    const pending: Id[] = []
    let current: Id | undefined = start
    while (current !== undefined && !visited.has(current)) {
      visited.add(current)
      pending.push(current)
      current = resolvedDependency(graph, current).getOrUndefined()
    }
    order.push(...pending.toReversed())
  }
  return order
}
