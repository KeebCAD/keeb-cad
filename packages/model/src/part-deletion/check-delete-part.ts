import { Result } from '@keeb-cad/result'
import type { Design, Frozen, Id, Rejection } from '@keeb-cad/schema'

import { reject } from '../reject/reject'

export function checkDeletePart(design: Frozen<Design>, id: Id): Result<void, Rejection> {
  return design.meta.defaultPart === id
    ? Result.err(
        reject(
          'default-part-required',
          [id],
          `The part "${id}" is the design's default part and can't be deleted.`,
        ),
      )
    : Result.ok()
}
