export function describeValue(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'object') return 'object'
  return typeof value
}
