import { Option } from '@keeb-cad/result'
import { compareId, type Frozen, type Group, type Id } from '@keeb-cad/schema'

import { dependencyGraph, resolvedDependency, resolves } from './dependency-graph'
import type { AnchorCheck, DependencyGraph } from './types'

// What a loaded layout's anchors leave unplaced; the commands keep a design free of both faults,
// so only a file reaches them.
export function checkAnchors(layout: Frozen<Group>): AnchorCheck {
  const graph = dependencyGraph(layout)
  const unresolvable = [...graph]
    .filter(([, { dependency }]) => dependency?.kind === 'explicit' && !resolves(graph, dependency))
    .map(([id]) => id)
    .toSorted(compareId)
  const cycles = cyclesOf(graph)
  return { cycles, unresolvable, unplaced: unplacedOf(graph, cycles, unresolvable) }
}

// Each node has one dependency, so following them from every node meets each cycle once.
function cyclesOf(graph: DependencyGraph): Id[][] {
  const done = new Set<Id>()
  const cycles: Id[][] = []
  for (const start of graph.keys()) {
    const path: Id[] = []
    let current = Option.some<Id>(start)
    while (current.isSome() && !done.has(current.value) && !path.includes(current.value)) {
      path.push(current.value)
      current = resolvedDependency(graph, current.value)
    }
    if (current.isSome() && path.includes(current.value)) {
      cycles.push(fromLowest(path.slice(path.indexOf(current.value))))
    }
    for (const id of path) done.add(id)
  }
  return cycles.toSorted(([a], [b]) => compareId(a as Id, b as Id))
}

function fromLowest(cycle: Id[]): Id[] {
  const lowest = cycle.toSorted(compareId)[0] as Id
  const at = cycle.indexOf(lowest)
  return [...cycle.slice(at), ...cycle.slice(0, at)]
}

function unplacedOf(
  graph: DependencyGraph,
  cycles: readonly Id[][],
  unresolvable: readonly Id[],
): ReadonlySet<Id> {
  const placed = new Map<Id, boolean>()
  for (const id of [...cycles.flat(), ...unresolvable]) placed.set(id, false)
  for (const start of graph.keys()) {
    const path: Id[] = []
    let current = start
    let known = placed.get(current)
    while (known === undefined) {
      path.push(current)
      const next = resolvedDependency(graph, current)
      // Only a root with no anchor has no dependency once the unresolvable anchors are known.
      if (next.isNone()) {
        known = true
        break
      }
      current = next.value
      known = placed.get(current)
    }
    for (const id of path) placed.set(id, known)
  }
  return new Set([...placed].filter(([, isPlaced]) => !isPlaced).map(([id]) => id))
}
