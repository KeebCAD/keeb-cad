import { Result } from '@keeb-cad/result'
import type { Design, Frozen, Id, Rejection } from '@keeb-cad/schema'

import { reject } from '../reject/reject'
import { findNode } from './node-tree'

export function checkDuplicateNode(design: Frozen<Design>, id: Id): Result<void, Rejection> {
  if (id === design.layout.id) {
    return Result.err(reject('root-required', [id], `The root group "${id}" can't be duplicated.`))
  }
  if (findNode(design.layout, id) === undefined) {
    return Result.err(reject('unknown-target', [id], `The design has no node with the id "${id}".`))
  }
  return Result.ok()
}
