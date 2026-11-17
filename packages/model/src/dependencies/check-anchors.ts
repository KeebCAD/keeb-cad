import { compareCodeUnits, type Frozen, type Group } from '@keeb-cad/schema'

import { cyclesOf } from './cycles-of'
import { dependencyGraph, resolvedDependencies, resolves } from './dependency-graph'
import type { AnchorCheck } from './types'
import { unplacedOf } from './unplaced-of'

// What a loaded layout's anchors leave unplaced; the commands keep a design free of both faults,
// so only a file reaches them.
export function checkAnchors(layout: Frozen<Group>): AnchorCheck {
  const graph = dependencyGraph(layout)
  const unresolvable = [...graph]
    .filter(([, { dependency }]) => dependency?.kind === 'explicit' && !resolves(graph, dependency))
    .map(([id]) => id)
    .toSorted(compareCodeUnits)
  const dependencies = resolvedDependencies(graph)
  const cycles = cyclesOf(dependencies)
  return {
    cycles,
    unresolvable,
    unplaced: unplacedOf(dependencies, [...cycles.flat(), ...unresolvable]),
  }
}
