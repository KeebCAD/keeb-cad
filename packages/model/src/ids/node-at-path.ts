import { Option } from '@keeb-cad/result'
import type { Frozen, Group, Id } from '@keeb-cad/schema'

import { dependencyGraph } from '../dependencies/dependency-graph'
import { valueKey } from '../evaluation/value-key'
import type { Path } from '../references/types'
import type { NodeAtPath } from './types'

export function nodePaths(layout: Frozen<Group>): ReadonlyMap<string, Id> {
  return new Map([...dependencyGraph(layout)].map(([id, { path }]) => [valueKey(path), id]))
}

export function nodeAtPath(nodePaths: ReadonlyMap<string, Id>, path: Path): Option<NodeAtPath> {
  for (let at = path.length - 1; at > 0; at -= 1) {
    const id = nodePaths.get(valueKey(path.slice(0, at)))
    if (id !== undefined) return Option.some({ id, at })
  }
  return Option.none()
}
