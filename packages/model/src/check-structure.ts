import { Result } from '@keeb-cad/result'
import type { Design, Frozen, Id, Rejection } from '@keeb-cad/schema'

import type { Reference } from './references/types'
import { walkReferences } from './references/walk-references'
import { reject } from './reject/reject'

// Refuses only references the edit left dangling: one a loaded file already held blocks no edit.
export function checkStructure(
  previous: Frozen<Design>,
  next: Frozen<Design>,
): Result<void, Rejection> {
  const before = new Set(danglingTargets(previous).map(keyOf))
  const added = [
    ...new Set(
      danglingTargets(next)
        .filter((reference) => !before.has(keyOf(reference)))
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

function keyOf({ kind, target }: Reference): string {
  return `${kind} ${target}`
}

// Library targets resolve against the library, where an unknown one is a violation, not a refusal.
function danglingTargets(design: Frozen<Design>): Reference[] {
  const designParts = new Set<string>(design.parts.map(({ id }) => id))
  return [...walkReferences(design)].filter(
    ({ kind, target }) =>
      !target.startsWith('lib:') && !(kind === 'design-part' && designParts.has(target)),
  )
}
