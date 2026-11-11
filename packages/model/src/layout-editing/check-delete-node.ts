import { Result } from '@keeb-cad/result'
import type { Design, Frozen, Id, Rejection } from '@keeb-cad/schema'

import { reject } from '../reject/reject'
import { findNode } from './node-tree'

// Refuses the whole list on any bad id, so a stale request deletes nothing.
export function checkDeleteNode(
  design: Frozen<Design>,
  ids: readonly Id[],
): Result<void, Rejection> {
  const root = design.layout.id
  if (ids.includes(root)) {
    return Result.err(reject('root-required', [root], `The root group "${root}" can't be deleted.`))
  }
  const missing = ids.filter((id) => findNode(design.layout, id) === undefined)
  if (missing.length > 0) {
    const named = missing.map((id) => `"${id}"`).join(', ')
    return Result.err(
      reject('unknown-target', missing, `The design has no node with the id ${named}.`),
    )
  }
  return Result.ok()
}
