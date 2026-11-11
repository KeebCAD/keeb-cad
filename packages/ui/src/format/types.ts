export type DisplayUnit = 'mm' | 'deg' | 's' | 'percent' | 'none'

export type FormatOptions = {
  // A pointer sample: its sub-pixel remainder means nothing, so no `≈` marks the rounding.
  readout?: boolean
}
