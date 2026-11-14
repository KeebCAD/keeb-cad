import type { LayoutRow } from '@keeb-cad/protocol'

// In model mm and degrees.
export type MirrorAxisFrame = LayoutRow['frame']

export type MirrorAxisProps = { frame: MirrorAxisFrame }
