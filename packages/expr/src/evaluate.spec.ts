import { Result } from '@keeb-cad/result'
import { expectResult } from '@keeb-cad/result/testing'
import { describe, it } from 'vitest'

import { evaluate } from './evaluate'
import type { Value } from './types'

const mm = (value: number): Value => ({ value, unit: 'mm' })

describe('evaluate', () => {
  it.each([
    ['a sum of two parameters', 'wall + gap', { wall: mm(2), gap: mm(3) }, mm(5)],
    ['a product before a sum', '2 * wall + gap', { wall: mm(2), gap: mm(3) }, mm(7)],
    ['a group before a quotient', '(a + b) / 2', { a: mm(4), b: mm(2) }, mm(3)],
    ['a negated parameter', '-gap', { gap: mm(3) }, mm(-3)],
    ['a difference associated to the left', '1 - 2 - 3', {}, { value: -4 }],
    ['a unitless factor before a unit', '2 * 5mm', {}, mm(10)],
    ['a unitless factor after a unit', '5mm * 2', {}, mm(10)],
    ['a product of unitless values', '2 * 3', {}, { value: 6 }],
    ['a quotient of unitless values', '6 / 3', {}, { value: 2 }],
    ['a unit over a unitless divisor', '5mm / 2', {}, mm(2.5)],
    ['a divisor just below zero', '5mm / -0.5', {}, mm(-10)],
    ['a divisor just above zero', '5mm / 0.5', {}, mm(10)],
    ['a unit closed by a parenthesis', '(2mm)', {}, mm(2)],
    ['a name with _ and digits', 'key_2', { key_2: mm(1) }, mm(1)],
    ['a name in a non-Latin script', 'ширина', { ширина: mm(4) }, mm(4)],
    ['a tab between tokens', '2mm\t+ 1mm', {}, mm(3)],
    ['a minus between names, never part of one', 'a-b', { a: mm(3), b: mm(1) }, mm(2)],
    ['a deep nesting inside the length cap', `${'('.repeat(254)}1mm${')'.repeat(254)}`, {}, mm(1)],
  ])('evaluates %s', (_role, expression, scope, expected) => {
    expectResult(evaluate(expression, new Map(Object.entries(scope))), Result.ok(expected))
  })

  it.each([
    ['unlike units added', '1mm + 1deg', 0, 10],
    ['unlike units subtracted', '1mm - 1deg', 0, 10],
    ['no unit added to a unit', '1 + 1mm', 0, 7],
    ['a unit added to no unit', '1mm + 1', 0, 7],
    ['a unit times a unit', '2mm * 3mm', 0, 9],
    ['a unit over a unit', '6mm / 3mm', 0, 9],
    ['no unit over a unit', '2 / 5mm', 0, 7],
    ['a unit over a zero with a unit', '5mm / 0mm', 0, 9],
    ['a failing sum inside parentheses', '2 * (1mm + 1deg)', 5, 15],
  ])('refuses %s as a unit mismatch', (_role, expression, start, end) => {
    expectResult(
      evaluate(expression, new Map()),
      Result.err({ kind: 'unit-mismatch', span: { start, end } }),
    )
  })

  it.each([
    ['a divisor on zero', '5mm / 0', 0, 7],
    ['a divisor on negative zero', '5mm / -0', 0, 8],
    ['a failing division below the root', '1 + 5mm / 0', 4, 11],
  ])('refuses %s as a division by zero', (_role, expression, start, end) => {
    expectResult(
      evaluate(expression, new Map()),
      Result.err({ kind: 'division-by-zero', span: { start, end } }),
    )
  })

  it.each([
    ['a name missing from the scope', 'gap', 'gap', 0, 3],
    ['a unit word as a name', 'mm', 'mm', 0, 2],
    ["a prototype member's name", 'constructor', 'constructor', 0, 11],
    ['a missing name below the root', '1 + gap', 'gap', 4, 7],
    ['the first failure, left to right', 'a + 1mm * 1mm', 'a', 0, 1],
  ])('refuses %s as unresolvable', (_role, expression, name, start, end) => {
    expectResult(
      evaluate(expression, new Map()),
      Result.err({ kind: 'unresolvable-reference', name, span: { start, end } }),
    )
  })

  it.each([
    ['a broken expression', '(2 * (gap +)', 11],
    ['a deep nesting past the length cap', `${'('.repeat(3000)}1mm${')'.repeat(3000)}`, 512],
    ['a long chain past the length cap', Array.from({ length: 5000 }, () => '1').join(' + '), 512],
  ])('refuses %s with its syntax error', (_role, expression, expectedOffset) => {
    expectResult(
      evaluate(expression, new Map()),
      Result.err({ kind: 'expression-syntax-error', input: expression, offset: expectedOffset }),
    )
  })
})
