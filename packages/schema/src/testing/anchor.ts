import type { Anchor } from '../types'
import { anId } from './id'

export function aSlotAnchor({
  ref = anId('slot'),
  ...fields
}: Partial<Omit<Extract<Anchor, { type: 'slot' }>, 'type'>> = {}): Extract<
  Anchor,
  { type: 'slot' }
> {
  return { type: 'slot', ref, ...fields }
}

export function aGroupAnchor({
  ref = anId('group'),
}: Partial<Omit<Extract<Anchor, { type: 'group' }>, 'type'>> = {}): Extract<
  Anchor,
  { type: 'group' }
> {
  return { type: 'group', ref }
}

// A record, not ts-pattern's match: indexing a mapped type with T keeps the branch's return type without a cast.
const anchorBuilders: { [T in Anchor['type']]: () => Extract<Anchor, { type: T }> } = {
  slot: aSlotAnchor,
  group: aGroupAnchor,
}

export function anAnchor<T extends Anchor['type']>(type: T): Extract<Anchor, { type: T }> {
  return anchorBuilders[type]()
}
