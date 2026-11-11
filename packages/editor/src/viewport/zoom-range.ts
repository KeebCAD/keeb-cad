import { maxZoomPercent, minZoomPercent } from './viewport-limits'
import { zoomForPercent } from './zoom-percent'

export const minZoom = zoomForPercent(minZoomPercent)
export const maxZoom = zoomForPercent(maxZoomPercent)
