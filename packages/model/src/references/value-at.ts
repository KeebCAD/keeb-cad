import type { Path } from './types'

export function valueAt(root: unknown, path: Path): unknown {
  return path.reduce<unknown>(
    (value, key) => (value as Record<string | number, unknown>)[key],
    root,
  )
}
