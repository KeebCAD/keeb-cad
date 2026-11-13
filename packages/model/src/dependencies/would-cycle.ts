import type { Design, Frozen, Id } from '@keeb-cad/schema'

import { anchorCycle } from './anchor-cycle'
import { dependencyGraph } from './dependency-graph'

export function wouldCycle(design: Frozen<Design>, node: Id, target: Id): boolean {
  return anchorCycle(dependencyGraph(design.layout), node, target).isSome()
}
