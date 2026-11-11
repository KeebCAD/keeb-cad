import { maxZoom, minZoom } from './zoom-range'

export function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, minZoom), maxZoom)
}
