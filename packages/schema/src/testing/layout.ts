import type { ChainGroup, FreeGroup, Group, Slot } from '../types'
import { anId } from './id'

export function aSlot({ id = anId('slot') }: Partial<Slot> = {}): Slot {
  return { id }
}

export function aFreeGroup({
  id = anId('free-group'),
  children = [],
}: Partial<Omit<FreeGroup, 'arrangement'>> = {}): FreeGroup {
  return { id, arrangement: 'free', children }
}

export function aChainGroup({
  id = anId('chain-group'),
  axis = 'x',
  children = [],
}: Partial<Omit<ChainGroup, 'arrangement'>> = {}): ChainGroup {
  return { id, arrangement: 'chain', axis, children }
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

export function aLayout({
  id = anId('root'),
  ...fields
}: Partial<Omit<FreeGroup, 'arrangement'>> = {}): FreeGroup {
  return aFreeGroup({ id, ...fields })
}
