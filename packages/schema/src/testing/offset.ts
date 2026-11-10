import type { Offset } from '../types'

// Every field is optional, and an absent one is the identity, so the default is empty.
export function anOffset(fields: Offset = {}): Offset {
  return { ...fields }
}
