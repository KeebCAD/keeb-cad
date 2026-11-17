import { Option, Result } from '@keeb-cad/result'
import {
  compareCodeUnits,
  type Design,
  type Frozen,
  type ItemId,
  type Rejection,
} from '@keeb-cad/schema'

import { anchorCycle } from './dependencies/anchor-cycle'
import { dependencyGraph, resolvedDependencies } from './dependencies/dependency-graph'
import { parameterDependencies } from './dependencies/parameter-dependencies'
import type { Dependencies } from './dependencies/types'
import { evaluateExpressions } from './evaluation/evaluate-expressions'
import type { FieldViolation } from './evaluation/types'
import { nodeIdOf } from './ids/side-qualified-id'
import { isGroup } from './layout-editing/node-tree'
import type { Reference } from './references/types'
import { walkReferences } from './references/walk-references'
import { reject } from './reject/reject'
import { dependencyCycleMessage } from './violations/dependency-cycle-message'
import { expressionFaultMessage } from './violations/expression-fault-message'

// Refuses only what the edit broke: a dangling reference, a cycle or a failing expression a loaded
// file already held blocks no edit. A dangling reference is named before a cycle, and a cycle
// before an expression, so one edit always gives one rejection.
export function checkStructure(
  previous: Frozen<Design>,
  next: Frozen<Design>,
): Result<void, Rejection> {
  return checkReferences(previous, next)
    .flatMap(() => checkCycles(previous, next))
    .flatMap(() => checkExpressions(previous, next))
}

function checkReferences(previous: Frozen<Design>, next: Frozen<Design>): Result<void, Rejection> {
  const before = new Set(danglingTargets(previous).map(referenceKey))
  const added = [
    ...new Set(
      danglingTargets(next)
        .filter((reference) => !before.has(referenceKey(reference)))
        .map(({ target }) => target),
    ),
  ] as ItemId[]
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

// Node loops before parameter loops; only a loop through an edge the edit added is refused, found
// from the changed items in compareCodeUnits order and listed from the changed item.
function checkCycles(previous: Frozen<Design>, next: Frozen<Design>): Result<void, Rejection> {
  const layers = [
    {
      members: 'nodes',
      was: resolvedDependencies(dependencyGraph(previous.layout)),
      is: resolvedDependencies(dependencyGraph(next.layout)),
    },
    {
      members: 'parameters',
      was: parameterDependencies(previous.parameters),
      is: parameterDependencies(next.parameters),
    },
  ] as const
  for (const { members, was, is } of layers) {
    const loop = addedLoop(was, is)
    if (loop.isSome()) {
      const ids = loop.value as ItemId[]
      return Result.err(reject('dependency-cycle', ids, dependencyCycleMessage(ids, members)))
    }
  }
  return Result.ok()
}

function addedLoop(was: Dependencies<string>, is: Dependencies<string>): Option<string[]> {
  for (const item of [...is.keys()].toSorted(compareCodeUnits)) {
    const had = new Set(was.get(item))
    for (const target of is.get(item) ?? []) {
      if (had.has(target)) continue
      const loop = anchorCycle(is, item, target)
      if (loop.isSome()) return loop
    }
  }
  return Option.none()
}

// The first field the edit made fail, in design order, named alone.
function checkExpressions(previous: Frozen<Design>, next: Frozen<Design>): Result<void, Rejection> {
  const before = new Set(evaluationOf(previous).fieldViolations.map(fieldViolationKey))
  const added = evaluationOf(next).fieldViolations.find(
    (violation) => !before.has(fieldViolationKey(violation)),
  )
  if (added === undefined) return Result.ok()
  const ids = [added.item]
  return Result.err(reject(added.kind, ids, expressionFaultMessage(added, ids)))
}

function evaluationOf(design: Frozen<Design>) {
  return evaluateExpressions({
    designId: design.meta.id,
    parameters: design.parameters,
    gap: design.meta.gap,
    layout: design.layout,
  })
}

function fieldViolationKey({ kind, item, path, name = '' }: FieldViolation): string {
  return [kind, item, path.join('/'), name].join(' ')
}

function referenceKey({ kind, target }: Reference): string {
  return `${kind} ${target}`
}

// Library targets resolve against the library, where an unknown one is a violation, not a refusal.
// A side placement resolves to the slot after its side prefix.
function danglingTargets(design: Frozen<Design>): Reference[] {
  const parts = new Set<string>(design.parts.map(({ id }) => id))
  const slots = nodeIds(design, false)
  const groups = nodeIds(design, true)
  const resolves = new Map<string, (target: string) => boolean>([
    ['design-part', (target) => parts.has(target)],
    ['slot', (target) => slots.has(target)],
    ['group', (target) => groups.has(target)],
    ['side-placement', (target) => slots.has(nodeIdOf(target))],
  ])
  // A name no parameter carries is an expression's unresolvable-reference, not a dangling target.
  return [...walkReferences(design)].filter(
    ({ kind, target }) =>
      kind !== 'parameter' && !target.startsWith('lib:') && resolves.get(kind)?.(target) !== true,
  )
}

function nodeIds(design: Frozen<Design>, groups: boolean): ReadonlySet<string> {
  return new Set(
    [...dependencyGraph(design.layout)]
      .filter(([, { node }]) => isGroup(node) === groups)
      .map(([id]) => id),
  )
}
