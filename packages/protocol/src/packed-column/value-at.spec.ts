import { describe, expect, it } from 'vitest'

import { valueAt } from './value-at'

const COLUMN = new Float64Array([10, 20, 30])

describe('valueAt', () => {
  it.each([
    ['the first row', 0, 10],
    ['the last row', 2, 30],
  ])('reads %s', (_role, row, expected) => {
    expect(valueAt(COLUMN, row)).toBe(expected)
  })

  it.each([
    ['just below the first row', COLUMN, -1],
    ['just above the last row', COLUMN, 3],
    ['a fractional row', COLUMN, 0.5],
    ['any row of a zero-row column', new Float64Array(), 0],
  ])('refuses %s', (_role, column, row) => {
    expect(() => valueAt(column, row)).toThrow(RangeError)
  })
})
