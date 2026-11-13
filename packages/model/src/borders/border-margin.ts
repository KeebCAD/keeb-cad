const LEAST_MARGIN = 1

// The smaller gap axis, so a negative or near-zero gap still leaves a visible border.
export function borderMargin(gap: { x: number; y: number }): number {
  return Math.max(LEAST_MARGIN, Math.min(gap.x, gap.y))
}
