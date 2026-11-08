import { Result } from '@keeb-cad/result'

import type { ParseError, Unit } from './types'

const LITERAL = /^(-?\d+(?:\.\d+)?)(mm|deg)$/

export function parseExpression(input: string): Result<{ value: number; unit: Unit }, ParseError> {
  const match = LITERAL.exec(input)
  if (match === null) return Result.err({ kind: 'expression-parse-failed', input })
  const value = Number(match[1])
  return Number.isFinite(value)
    ? Result.ok({ value, unit: match[2] as Unit })
    : Result.err({ kind: 'expression-parse-failed', input })
}
