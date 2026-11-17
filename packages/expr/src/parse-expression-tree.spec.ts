import { Result } from '@keeb-cad/result'
import { expectResult } from '@keeb-cad/result/testing'
import { describe, it } from 'vitest'

import { parseExpressionTree } from './parse-expression-tree'

const OVERFLOWING = '9'.repeat(309)
const NINES = '9'.repeat(308)
const ONE_ULP_BELOW_MAX = Number.MAX_VALUE - 2 ** 971
const ONE_ULP_BELOW_MAX_DIGITS = BigInt(ONE_ULP_BELOW_MAX).toString()
const MAX_VALUE_DIGITS = BigInt(Number.MAX_VALUE).toString()
const HALF_ULP_ABOVE_MAX_DIGITS = (BigInt(Number.MAX_VALUE) + 2n ** 970n).toString()
const LENGTH_CAP = 512
const NESTED_INSIDE_CAP = 254

describe('parseExpressionTree', () => {
  it('gives every node its span', () => {
    expectResult(
      parseExpressionTree('-(a + 2mm) * 3'),
      Result.ok({
        type: 'binary',
        op: '*',
        start: 0,
        end: 14,
        left: {
          type: 'negate',
          start: 0,
          end: 10,
          operand: {
            type: 'binary',
            op: '+',
            start: 2,
            end: 9,
            left: { type: 'name', name: 'a', start: 2, end: 3 },
            right: { type: 'number', value: 2, unit: 'mm', start: 6, end: 9 },
          },
        },
        right: { type: 'number', value: 3, start: 13, end: 14 },
      }),
    )
  })

  it.each([
    [
      'parentheses on a left operand',
      '(a) + b',
      { start: 0, end: 7 },
      { type: 'name', name: 'a', start: 1, end: 2 },
      { type: 'name', name: 'b', start: 6, end: 7 },
    ],
    [
      'parentheses on a right operand',
      'a + (b)',
      { start: 0, end: 7 },
      { type: 'name', name: 'a', start: 0, end: 1 },
      { type: 'name', name: 'b', start: 5, end: 6 },
    ],
    [
      'whitespace outside every span',
      ' a + b ',
      { start: 1, end: 6 },
      { type: 'name', name: 'a', start: 1, end: 2 },
      { type: 'name', name: 'b', start: 5, end: 6 },
    ],
    [
      'an astral letter counted as two UTF-16 units',
      '𝒳 + 1mm',
      { start: 0, end: 8 },
      { type: 'name', name: '𝒳', start: 0, end: 2 },
      { type: 'number', value: 1, unit: 'mm', start: 5, end: 8 },
    ],
  ] as const)('spans a sum with %s', (_role, input, span, left, right) => {
    expectResult(
      parseExpressionTree(input),
      Result.ok({ type: 'binary', op: '+', ...span, left, right }),
    )
  })

  it.each([
    [
      'a minus at an operand position',
      '2 * -3',
      {
        type: 'binary',
        op: '*',
        start: 0,
        end: 6,
        left: { type: 'number', value: 2, start: 0, end: 1 },
        right: {
          type: 'negate',
          start: 4,
          end: 6,
          operand: { type: 'number', value: 3, start: 5, end: 6 },
        },
      },
    ],
    [
      'a minus nested in a minus',
      '--19mm',
      {
        type: 'negate',
        start: 0,
        end: 6,
        operand: {
          type: 'negate',
          start: 1,
          end: 6,
          operand: { type: 'number', value: 19, unit: 'mm', start: 2, end: 6 },
        },
      },
    ],
    [
      'a quotient grouped from the left',
      '8 / 4 / 2',
      {
        type: 'binary',
        op: '/',
        start: 0,
        end: 9,
        left: {
          type: 'binary',
          op: '/',
          start: 0,
          end: 5,
          left: { type: 'number', value: 8, start: 0, end: 1 },
          right: { type: 'number', value: 4, start: 4, end: 5 },
        },
        right: { type: 'number', value: 2, start: 8, end: 9 },
      },
    ],
    ['a name with _ and digits', 'key_2', { type: 'name', name: 'key_2', start: 0, end: 5 }],
    ['a name in a non-Latin script', 'ширина', { type: 'name', name: 'ширина', start: 0, end: 6 }],
    [
      'a tab between tokens',
      '2mm\t+ 1mm',
      {
        type: 'binary',
        op: '+',
        start: 0,
        end: 9,
        left: { type: 'number', value: 2, unit: 'mm', start: 0, end: 3 },
        right: { type: 'number', value: 1, unit: 'mm', start: 6, end: 9 },
      },
    ],
    [
      'a minus between names, never part of one',
      'a-b',
      {
        type: 'binary',
        op: '-',
        start: 0,
        end: 3,
        left: { type: 'name', name: 'a', start: 0, end: 1 },
        right: { type: 'name', name: 'b', start: 2, end: 3 },
      },
    ],
    [
      'a unit closed by a parenthesis',
      '(2mm)',
      { type: 'number', value: 2, unit: 'mm', start: 1, end: 4 },
    ],
    [
      'a deep nesting inside the length cap',
      `${'('.repeat(NESTED_INSIDE_CAP)}1mm${')'.repeat(NESTED_INSIDE_CAP)}`,
      {
        type: 'number',
        value: 1,
        unit: 'mm',
        start: NESTED_INSIDE_CAP,
        end: NESTED_INSIDE_CAP + 3,
      },
    ],
  ] as const)('parses %s', (_role, input, expected) => {
    expectResult(parseExpressionTree(input), Result.ok(expected))
  })

  it.each([
    ['just below the length cap', LENGTH_CAP - 1],
    ['on the length cap', LENGTH_CAP],
  ])('parses a sum padded to %s', (_role, length) => {
    expectResult(
      parseExpressionTree('1 + 1'.padEnd(length, ' ')),
      Result.ok({
        type: 'binary',
        op: '+',
        start: 0,
        end: 5,
        left: { type: 'number', value: 1, start: 0, end: 1 },
        right: { type: 'number', value: 1, start: 4, end: 5 },
      }),
    )
  })

  it.each([
    ['one digit short of overflow', `${NINES}mm`, 1e308],
    ['one ulp below the largest double', `${ONE_ULP_BELOW_MAX_DIGITS}mm`, ONE_ULP_BELOW_MAX],
    ['the largest double', `${MAX_VALUE_DIGITS}mm`, Number.MAX_VALUE],
  ])('holds a number with %s', (_role, input, expectedValue) => {
    expectResult(
      parseExpressionTree(input),
      Result.ok({ type: 'number', value: expectedValue, unit: 'mm', start: 0, end: input.length }),
    )
  })

  it.each([
    ['a broken group', '(2 * (gap +)', 11],
    ['an input that ends too early', '2 +', 3],
    ['the empty input', '', 0],
    ['whitespace only', ' '.repeat(3), 0],
    ['whitespace after a trailing operator', '2 +   ', 6],
    ['a space before a unit', '19 mm', 3],
    ['a unit followed by a letter', '2degree', 1],
    ['a unit followed by a non-Latin letter', '2mmш', 1],
    ['a unit followed by a digit', '2mm3', 1],
    ['a unit followed by _', '2mm_x', 1],
    ['a name starting with a digit', '2gap', 1],
    ['a non-ASCII digit after a number', '2٣', 1],
    ['a non-ASCII digit in a name', 'a٣', 1],
    ['a name starting with _', '_a', 0],
    ['a newline between tokens', '2mm +\ngap', 5],
    ['a carriage return between tokens', '2mm +\rgap', 5],
    ['a no-break space between tokens', '2mm +\u{A0}gap', 5],
    ['half an ulp above the largest double', `${HALF_ULP_ABOVE_MAX_DIGITS}mm`, 0],
    ['one digit past overflow', `${OVERFLOWING}mm`, 0],
    ['one digit past overflow inside a sum', `1mm + ${OVERFLOWING}mm`, 6],
    ['a sum padded to just above the length cap', '1 + 1'.padEnd(LENGTH_CAP + 1, ' '), LENGTH_CAP],
    ['a deep nesting past the length cap', `${'('.repeat(3000)}1mm${')'.repeat(3000)}`, LENGTH_CAP],
  ])('refuses %s at the expected offset', (_role, input, expectedOffset) => {
    expectResult(
      parseExpressionTree(input),
      Result.err({ kind: 'expression-syntax-error', input, offset: expectedOffset }),
    )
  })
})
