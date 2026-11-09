import type { QuantityInputValue } from '../types'
import { anExpression } from './expression'

export function aQuantityInputValue(text = '19mm'): QuantityInputValue {
  return { type: 'quantity', value: anExpression(text) }
}
