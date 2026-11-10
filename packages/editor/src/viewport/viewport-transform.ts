import type { CanvasSize, Point, ViewportValue } from './types'

// The one model-to-screen mapping: the canvas centre is the viewport's centre, and y flips.
export function viewportTransform({ centre, zoom }: ViewportValue, size: CanvasSize): string {
  return `translate(${size.width / 2}, ${size.height / 2}) scale(${zoom}, ${-zoom}) translate(${-centre.x}, ${-centre.y})`
}

export function modelToScreen(
  point: Point,
  { centre, zoom }: ViewportValue,
  size: CanvasSize,
): Point {
  return {
    x: size.width / 2 + zoom * (point.x - centre.x),
    y: size.height / 2 - zoom * (point.y - centre.y),
  }
}
