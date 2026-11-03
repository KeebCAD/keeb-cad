export function findFrozen(value: unknown, path = '$'): string[] {
  if (typeof value !== 'object' || value === null) return []
  const own = Object.isFrozen(value) ? [path] : []
  const nested = Object.entries(value).flatMap(([key, child]) =>
    findFrozen(child, `${path}.${key}`),
  )
  return [...own, ...nested]
}
