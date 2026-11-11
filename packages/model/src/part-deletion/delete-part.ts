import type { Design, Id, Mutable, Rejection } from '@keeb-cad/schema'

import { checkDeletePart } from './check-delete-part'

export function deletePart(design: Mutable<Design>, id: Id): void | Rejection {
  const checked = checkDeletePart(design, id)
  if (checked.isErr()) return checked.error
  design.parts = design.parts.filter((part) => part.id !== id)
}
