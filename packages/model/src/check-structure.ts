import { InvariantError, Result } from '@keeb-cad/result'
import { compareId, type Design, type Frozen, type Id, type Rejection } from '@keeb-cad/schema'

import { checkAnchors } from './dependencies/check-anchors'
import { dependencyGraph } from './dependencies/dependency-graph'
import type { DependencyGraph } from './dependencies/types'
import { isGroup } from './layout-editing/node-tree'
import type { Reference } from './references/types'
import { walkReferences } from './references/walk-references'
import { reject } from './reject/reject'
import { dependencyCycleMessage } from './violations/dependency-cycle-message'

// Refuses only what the edit broke: a dangling reference or a cycle a loaded file already held
// blocks no edit. A dangling reference is named before a cycle, so one edit always gives one
// rejection.
export function checkStructure(
  previous: Frozen<Design>,
  next: Frozen<Design>,
): Result<void, Rejection> {
  return checkReferences(previous, next).flatMap(() => checkCycles(previous, next))
}

function checkReferences(previous: Frozen<Design>, next: Frozen<Design>): Result<void, Rejection> {
  const before = new Set(danglingTargets(previous).map(referenceKey))
  const added = [
    ...new Set(
      danglingTargets(next)
        .filter((reference) => !before.has(referenceKey(reference)))
        .map(({ target }) => target),
    ),
  ] as Id[]
  if (added.length === 0) return Result.ok()
  const named = added.map((id) => `"${id}"`).join(', ')
  return Result.err(
    reject(
      'unknown-target',
      added,
      `The design has nothing of the right kind with the id ${named}.`,
    ),
  )
}

// Of several new cycles, the one whose changed member is lowest by compareId, listed from it.
function checkCycles(previous: Frozen<Design>, next: Frozen<Design>): Result<void, Rejection> {
  const before = new Set(checkAnchors(previous.layout).cycles.map(cycleKey))
  const fresh = checkAnchors(next.layout).cycles.filter((cycle) => !before.has(cycleKey(cycle)))
  if (fresh.length === 0) return Result.ok()
  const was = dependencyGraph(previous.layout)
  const is = dependencyGraph(next.layout)
  const [first] = fresh
    .map((cycle) => fromChanged(cycle, was, is))
    .toSorted(([a], [b]) => compareId(a as Id, b as Id))
  const ids = first as Id[]
  return Result.err(reject('dependency-cycle', ids, dependencyCycleMessage(ids)))
}

function fromChanged(cycle: readonly Id[], was: DependencyGraph, is: DependencyGraph): Id[] {
  const [changed] = cycle
    .filter((id) => dependencyKey(was, id) !== dependencyKey(is, id))
    .toSorted(compareId)
  // A cycle whose every member kept its dependency was already there, so it is not new.
  if (changed === undefined) throw new InvariantError('A new cycle has no changed member.')
  const at = cycle.indexOf(changed)
  return [...cycle.slice(at), ...cycle.slice(0, at)]
}

function dependencyKey(graph: DependencyGraph, id: Id): string | undefined {
  const dependency = graph.get(id)?.dependency
  return dependency === undefined ? undefined : `${dependency.kind} ${dependency.target}`
}

function cycleKey(cycle: readonly Id[]): string {
  return cycle.toSorted(compareId).join(' ')
}

function referenceKey({ kind, target }: Reference): string {
  return `${kind} ${target}`
}

// Library targets resolve against the library, where an unknown one is a violation, not a refusal.
function danglingTargets(design: Frozen<Design>): Reference[] {
  const targets = new Map<string, ReadonlySet<string>>([
    ['design-part', new Set<string>(design.parts.map(({ id }) => id))],
    ['slot', nodeIds(design, false)],
    ['group', nodeIds(design, true)],
  ])
  return [...walkReferences(design)].filter(
    ({ kind, target }) => !target.startsWith('lib:') && targets.get(kind)?.has(target) !== true,
  )
}

function nodeIds(design: Frozen<Design>, groups: boolean): ReadonlySet<string> {
  return new Set(
    [...dependencyGraph(design.layout)]
      .filter(([, { node }]) => isGroup(node) === groups)
      .map(([id]) => id),
  )
}
