import { Option } from '@keeb-cad/result'
import type { Frozen, Group, Id, Node } from '@keeb-cad/schema'

import { isGroup } from '../layout-editing/node-tree'
import type { Dependency, DependencyGraph, GraphEntry } from './types'

// Every node with the one node it depends on: a free child its explicit anchor's target, else its
// parent; a chain child its previous sibling, else its parent. The root depends only on an
// explicit anchor, which always closes a cycle or doesn't resolve, since every node depends on it.
export function dependencyGraph(layout: Frozen<Group>): DependencyGraph {
  const root: GraphEntry =
    layout.anchor === undefined
      ? { node: layout, index: 0 }
      : {
          node: layout,
          index: 0,
          dependency: { kind: 'explicit', target: layout.anchor.ref, anchor: layout.anchor },
        }
  const graph = new Map<Id, GraphEntry>([[layout.id, root]])
  const visit = (group: Frozen<Group>) => {
    for (const [index, child] of group.children.entries()) {
      graph.set(child.id, {
        node: child,
        parent: group.id,
        index,
        dependency: dependencyOf(group, child as Frozen<Node>, index),
      })
      if (isGroup(child)) visit(child)
    }
  }
  visit(layout)
  return graph
}

// The node a node's dependency leads to, when it resolves: an explicit anchor naming a missing id
// or a node of the wrong kind leads nowhere.
export function resolvedDependency(graph: DependencyGraph, id: Id): Option<Id> {
  const dependency = graph.get(id)?.dependency
  if (dependency === undefined) return Option.none()
  if (dependency.kind !== 'explicit') return Option.some(dependency.target)
  return resolves(graph, dependency) ? Option.some(dependency.target) : Option.none()
}

export function resolves(
  graph: DependencyGraph,
  { target, anchor }: Extract<Dependency, { kind: 'explicit' }>,
): boolean {
  const found = graph.get(target)
  const namesGroup = anchor.type === 'group'
  return found !== undefined && isGroup(found.node) === namesGroup
}

function dependencyOf(group: Frozen<Group>, child: Frozen<Node>, index: number): Dependency {
  if (group.arrangement === 'chain') {
    const previous = group.children[index - 1]
    return previous === undefined
      ? { kind: 'parent', target: group.id }
      : { kind: 'previous', target: previous.id, axis: group.axis }
  }
  return child.anchor === undefined
    ? { kind: 'parent', target: group.id }
    : { kind: 'explicit', target: child.anchor.ref, anchor: child.anchor }
}
