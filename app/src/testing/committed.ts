import type { Committed, DesignStore } from '@keeb-cad/design'

export function committed(store: DesignStore): Committed {
  const current = store.current
  if (current.isNone()) throw new Error('Expected a committed design.')
  return current.value
}
