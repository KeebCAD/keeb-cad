export type Unit = 'mm' | 'deg'

export interface ParseError {
  kind: 'expression-parse-failed'
  input: string
}

export type Span = { start: number; end: number }

export type ExpressionTree = Span &
  (
    | { type: 'number'; value: number; unit?: Unit }
    | { type: 'name'; name: string }
    | { type: 'negate'; operand: ExpressionTree }
    | { type: 'binary'; op: '+' | '-' | '*' | '/'; left: ExpressionTree; right: ExpressionTree }
  )

export type ExpressionSyntaxError = {
  kind: 'expression-syntax-error'
  input: string
  offset: number
}

export type Value = { value: number; unit?: Unit }

export type EvaluateError =
  | { kind: 'unit-mismatch' | 'division-by-zero'; span: Span }
  | { kind: 'unresolvable-reference'; name: string; span: Span }
