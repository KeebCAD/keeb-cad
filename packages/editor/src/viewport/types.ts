import type { Id } from '@keeb-cad/schema'
import type * as v from 'valibot'
import type { ComputedRef } from 'vue'

import type { viewportValueSchema } from './viewport-value-schema'

// Model points are in mm, y up; screen points in px, y down, from the canvas's top left.
export type Point = { x: number; y: number }

export type CanvasSize = { width: number; height: number }

// In model mm, in the keys group's space inside the viewport's group.
export type Bounds = { x: number; y: number; width: number; height: number }

// Zoom is screen px per model mm.
export type ViewportValue = v.InferOutput<typeof viewportValueSchema>

export type WheelReading =
  { kind: 'notch'; direction: 'in' | 'out' } | { kind: 'pan'; delta: Point } | { kind: 'none' }

// A viewport edit, with the storage key of the design it was made for.
export type ViewportEdit = { key: string; value: ViewportValue }

// Where the pointer sits on the canvas, with the canvas size it was read against.
export type CursorSample = { screen: Point; size: CanvasSize }

export type CanvasItem = { id: Id; element: SVGGraphicsElement }

export type CanvasRoot = { svg: SVGSVGElement; keys: SVGGElement }

export type UseViewportResult = {
  transform: ComputedRef<string>
  modelToScreen: (point: Point) => Point
  fitOnce: (bounds: Bounds) => void
}
