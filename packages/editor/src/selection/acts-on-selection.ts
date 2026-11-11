import type { Option } from '@keeb-cad/result'
import type { Workspace } from '@keeb-cad/schema'

import type { LandmarkPlace } from '../landmarks/types'

// The canvas draws the layout only on Layout; the Tree shows the same selection on every workspace.
export function actsOnSelection(
  focused: Option<LandmarkPlace>,
  workspace: Option<Workspace>,
): boolean {
  return focused
    .map((place) =>
      place === 'canvas'
        ? workspace.map((open) => open === 'layout').getOr(false)
        : place === 'slide-out',
    )
    .getOr(false)
}
