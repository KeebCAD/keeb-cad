export type Unit = 'mm' | 'deg'

export interface ParseError {
  kind: 'expression-parse-failed'
  input: string
}
