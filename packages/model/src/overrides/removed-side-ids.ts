import type { Frozen, Group, Override, SideId } from '@keeb-cad/schema'

import { resolvesToSlot } from './override-target'

// The side placements whose part a resolved override removes; one that doesn't resolve is ignored.
export function removedSideIds(
  overrides: Frozen<Override[]>,
  layout: Frozen<Group>,
): ReadonlySet<SideId> {
  return new Set(
    overrides
      .filter(
        (override) =>
          override.type === 'side-part' &&
          override.part === null &&
          resolvesToSlot(layout, override.target),
      )
      .map(({ target }) => target),
  )
}
