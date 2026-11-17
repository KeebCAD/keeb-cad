import type { Span } from '@keeb-cad/expr'

export interface SpliceEdit {
  span: Span
  text: string
}
