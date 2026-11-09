import type { Design, Id, Mutable, Rejection } from '@keeb-cad/schema'

import { reject } from '../reject/reject'

export function deletePart(design: Mutable<Design>, id: Id): void | Rejection {
  if (design.meta.defaultPart === id) {
    return reject(
      'default-part-required',
      [id],
      `The part "${id}" is the design's default part and can't be deleted.`,
    )
  }
  design.parts = design.parts.filter((part) => part.id !== id)
}
