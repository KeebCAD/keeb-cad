import type { ItemId } from '@keeb-cad/schema'
import { match, P } from 'ts-pattern'

import type { UnresolvedReference } from './types'

export function unresolvableReferenceMessage(
  reference: UnresolvedReference,
  ids: readonly ItemId[],
): string {
  const [named] = ids
  return match(reference)
    .with('part', () => `The slot "${String(named)}" names a part that doesn't resolve.`)
    .with('anchor', () => `The node "${String(named)}" has an anchor that doesn't resolve.`)
    .with('override', () => `The override on "${String(named)}" names a slot that doesn't resolve.`)
    .with({ parameter: P.string }, ({ parameter }) => {
      const users = ids.map((id) => `"${id}"`).join(', ')
      return `No parameter is named "${parameter}"; ${users} ${ids.length === 1 ? 'uses' : 'use'} it.`
    })
    .exhaustive()
}
