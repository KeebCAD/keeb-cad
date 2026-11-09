const FIRST_DELAY_MS = 1000
const MAX_DELAY_MS = 30_000

export function nextBackoffDelay(previousMs?: number): number {
  return previousMs === undefined ? FIRST_DELAY_MS : Math.min(previousMs * 2, MAX_DELAY_MS)
}
