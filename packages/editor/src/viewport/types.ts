import type { Id } from '@keeb-cad/schema'
import type { ComputedRef } from 'vue'

// Model points are in mm, y up; screen points in px, y down.
export type Point = { x: number; y: number }

export type CanvasSize = { width: number; height: number }

// In model mm, as SVG's getBBox gives them inside the viewport's group.
export type Bounds = { x: number; y: number; width: number; height: number }

// Zoom is screen px per model mm.
export type ViewportValue = { centre: Point; zoom: number }

export type UseViewportResult = {
  transform: ComputedRef<string>
  modelToScreen: (point: Point) => Point
  fitOnce: (designId: Id, bounds: Bounds) => void
}
