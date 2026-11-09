// UTF-16 code-unit order, so an ordering never depends on a locale.
export function compareId(a: string, b: string): number {
  return Number(a > b) - Number(a < b)
}
