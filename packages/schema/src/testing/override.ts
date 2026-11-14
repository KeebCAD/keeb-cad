import type { Override } from '../types'
import { aSideId } from './side-id'

export function aSidePartOverride({
  target = aSideId('right/id'),
  part = null,
}: Partial<Omit<Extract<Override, { type: 'side-part' }>, 'type'>> = {}): Extract<
  Override,
  { type: 'side-part' }
> {
  return { type: 'side-part', target, part }
}

export function aSideComponentOverride({
  target = aSideId('right/id'),
  component = 'encoder',
}: Partial<Omit<Extract<Override, { type: 'side-component' }>, 'type'>> = {}): Extract<
  Override,
  { type: 'side-component' }
> {
  return { type: 'side-component', target, component }
}

// A record, not ts-pattern's match: indexing a mapped type with T keeps the branch's return type without a cast.
const overrideBuilders: { [T in Override['type']]: () => Extract<Override, { type: T }> } = {
  'side-part': aSidePartOverride,
  'side-component': aSideComponentOverride,
}

export function anOverride<T extends Override['type']>(type: T): Extract<Override, { type: T }> {
  return overrideBuilders[type]()
}
