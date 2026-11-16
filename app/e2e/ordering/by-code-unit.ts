export function byCodeUnit(a: string, b: string): number {
  return Number(a > b) - Number(a < b)
}
