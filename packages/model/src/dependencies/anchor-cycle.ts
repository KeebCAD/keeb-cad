import { Option } from '@keeb-cad/result'
import type { Id } from '@keeb-cad/schema'

import { resolvedDependency } from './dependency-graph'
import type { DependencyGraph } from './types'

// The cycle that making `node` depend on `target` would close, in order from `node`.
export function anchorCycle(graph: DependencyGraph, node: Id, target: Id): Option<Id[]> {
  const cycle: Id[] = [node]
  let current = Option.some<Id>(target)
  while (current.isSome()) {
    const id = current.value
    if (id === node) return Option.some(cycle)
    // A loop that doesn't pass through `node` is not closed by this edge.
    if (cycle.includes(id) || !graph.has(id)) return Option.none()
    cycle.push(id)
    current = resolvedDependency(graph, id)
  }
  return Option.none()
}
