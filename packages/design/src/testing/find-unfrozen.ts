import { isProxy } from '@keeb-cad/reactive'
import { isDraft } from 'immer'

export function findUnfrozen(value: unknown, path = '$'): string[] {
  if (typeof value !== 'object' || value === null) return []
  const own = isProxy(value) || isDraft(value) || !Object.isFrozen(value) ? [path] : []
  const nested = Object.entries(value).flatMap(([key, child]) =>
    findUnfrozen(child, `${path}.${key}`),
  )
  return [...own, ...nested]
}
