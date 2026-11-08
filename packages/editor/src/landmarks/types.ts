export type LandmarkName = 'top-bar' | 'slide-out' | 'canvas' | 'inspector' | 'status-strip'

// The left rail is a place in the F6 order without being a landmark itself.
export type LandmarkPlace = LandmarkName | 'left-rail'

export type LandmarkTarget = { index: number; root: HTMLElement }
