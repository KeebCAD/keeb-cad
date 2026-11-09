export function sameKeys(
  a: ReadonlyMap<string, unknown>,
  b: ReadonlyMap<string, unknown>,
): boolean {
  if (a.size !== b.size) return false
  for (const key of a.keys()) if (!b.has(key)) return false
  return true
}
