import { pxPerMmAt100 } from './viewport-limits'

// Zoom is screen px per model mm; 100% is the CSS mm.
export function zoomPercent(zoom: number): number {
  return (zoom / pxPerMmAt100) * 100
}

export function zoomForPercent(percent: number): number {
  return (percent / 100) * pxPerMmAt100
}
