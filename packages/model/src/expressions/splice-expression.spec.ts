import { InvariantError } from '@keeb-cad/result'
import { describe, expect, it } from 'vitest'

import { spliceExpression } from './splice-expression'

const edit = (start: number, end: number, text: string) => ({ span: { start, end }, text })

describe('spliceExpression', () => {
  it.each([
    ['edits given out of order', 'a+b', [edit(2, 3, 'y'), edit(0, 1, 'x')], 'x+y'],
    ['no edit', 'a+b', [], 'a+b'],
    ['an edit on the end', 'ab', [edit(1, 2, 'c')], 'ac'],
    ['touching edits', 'abc', [edit(0, 1, 'x'), edit(1, 2, 'y')], 'xyc'],
    ['a zero-length edit, as an insertion', 'ab', [edit(1, 1, '+')], 'a+b'],
  ])('returns the spliced text for %s', (_role, expression, edits, expected) => {
    expect(spliceExpression(expression, edits)).toBe(expected)
  })

  it.each([
    ['overlapping spans', 'abc', [edit(0, 2, 'x'), edit(1, 3, 'y')]],
    ['a span past the end', 'ab', [edit(1, 3, 'x')]],
    ['a span ending before it starts', 'ab', [edit(2, 1, 'x')]],
  ])('throws InvariantError on %s', (_role, expression, edits) => {
    expect(() => spliceExpression(expression, edits)).toThrow(InvariantError)
  })
})
