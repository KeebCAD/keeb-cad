import type { PlacementId } from '@keeb-cad/schema'

// The surface whose pointer set the hovered node.
export type HoverSource = 'canvas' | 'tree'

export type UseHoveredNodeResult = {
  pointAt: (placement: PlacementId) => void
  pointAtTreeGroup: (nodeId: string) => void
  leave: () => void
  clear: () => void
  clearTreeHover: () => void
}
