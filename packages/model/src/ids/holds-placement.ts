import type { Design, Frozen, PlacementId } from '@keeb-cad/schema'

import { placementSides } from '../form/placement-sides'
import { subtreeIds } from '../layout-editing/node-tree'
import { nodeIdOf, sideOf } from './side-qualified-id'

// Whether the design still holds the node and the side an id places.
export function holdsPlacement(design: Frozen<Design>, id: PlacementId): boolean {
  return (
    placementSides(design.meta.form).includes(sideOf(id)) &&
    subtreeIds(design.layout).includes(nodeIdOf(id))
  )
}
