import type { Form } from '../types'

export function aForm({
  board = 'reversible',
}: Partial<Extract<Form, { type: 'split' }>> = {}): Form {
  return { type: 'split', board }
}
