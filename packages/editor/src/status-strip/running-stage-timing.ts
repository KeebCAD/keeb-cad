export const SHOWN_AFTER_MS = 1000

export function toNextChange(elapsed: number): number {
  const next =
    elapsed <= SHOWN_AFTER_MS ? SHOWN_AFTER_MS + 1 : (Math.floor(elapsed / 1000) + 1) * 1000
  return next - elapsed
}
