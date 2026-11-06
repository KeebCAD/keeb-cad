import type { ChainGroup, FreeGroup, Group } from '../types'
import { anId } from './id'

export function aFreeGroup({
  id = anId('free-group'),
  arrangement = 'free',
  children = [],
}: Partial<FreeGroup> = {}): FreeGroup {
  return { id, arrangement, children }
}

export function aChainGroup({
  id = anId('chain-group'),
  arrangement = 'chain',
  axis = 'x',
  children = [],
}: Partial<ChainGroup> = {}): ChainGroup {
  return { id, arrangement, axis, children }
}

// A record, not ts-pattern's match: indexing a mapped type with T keeps the branch's return type without a cast.
const groupBuilders: { [T in Group['arrangement']]: () => Extract<Group, { arrangement: T }> } = {
  free: aFreeGroup,
  chain: aChainGroup,
}

export function aGroup<T extends Group['arrangement']>(
  arrangement: T,
): Extract<Group, { arrangement: T }> {
  return groupBuilders[arrangement]()
}

export function aLayout({ id = anId('root'), ...fields }: Partial<FreeGroup> = {}): FreeGroup {
  return aFreeGroup({ id, ...fields })
}
