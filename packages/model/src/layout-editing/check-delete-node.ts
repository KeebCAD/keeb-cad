import { Result } from '@keeb-cad/result'
import type { Design, Frozen, Id, Rejection } from '@keeb-cad/schema'

import { reject } from '../reject/reject'
import { unknownNodeMessage } from '../violations/unknown-node-message'
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
  return missing.length > 0
    ? Result.err(reject('unknown-target', missing, unknownNodeMessage(missing)))
    : Result.ok()
}
