import type { DeclaredInput, OptionInput, PlainInput, QuantityInput } from '../types'
import { aQuantityInputValue } from './quantity-input-value'

export function aQuantityInput(overrides: Partial<QuantityInput> = {}): QuantityInput {
  return {
    kind: 'quantity',
    label: 'Width',
    unit: 'mm',
    default: aQuantityInputValue(),
    ...overrides,
  }
}

export function anOptionInput(overrides: Partial<OptionInput> = {}): OptionInput {
  return { kind: 'option', label: 'Style', options: ['a', 'b'], default: 'a', ...overrides }
}

export function aPlainInput(kind: PlainInput['kind'] = 'boolean'): PlainInput {
  return kind === 'boolean'
    ? { kind, label: 'Flag', default: false }
    : { kind, label: 'Name', default: '' }
}

export function aDeclaredInput(kind: DeclaredInput['kind'] = 'quantity'): DeclaredInput {
  if (kind === 'quantity') return aQuantityInput()
  if (kind === 'option') return anOptionInput()
  return aPlainInput(kind)
}
