import type { Form } from '../types'

export function aSplitForm({
  board = 'reversible',
}: Partial<Omit<Extract<Form, { type: 'split' }>, 'type'>> = {}): Extract<Form, { type: 'split' }> {
  return { type: 'split', board }
}

export function aUnibodyForm(): Extract<Form, { type: 'unibody' }> {
  return { type: 'unibody' }
}

// A record, not ts-pattern's match: indexing a mapped type with T keeps the branch's return type without a cast.
const formBuilders: { [T in Form['type']]: () => Extract<Form, { type: T }> } = {
  split: aSplitForm,
  unibody: aUnibodyForm,
}

export function aForm<T extends Form['type']>(type: T): Extract<Form, { type: T }> {
  return formBuilders[type]()
}
