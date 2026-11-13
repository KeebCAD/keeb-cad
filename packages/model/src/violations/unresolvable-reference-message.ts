import type { ItemId } from '@keeb-cad/schema'
import { match } from 'ts-pattern'

import type { UnresolvedReference } from './types'

export function unresolvableReferenceMessage(
  reference: UnresolvedReference,
  ids: readonly ItemId[],
): string {
  const [named] = ids
  return match(reference)
    .with('part', () => `The slot "${String(named)}" names a part that doesn't resolve.`)
    .with('anchor', () => `The node "${String(named)}" has an anchor that doesn't resolve.`)
    .exhaustive()
}
