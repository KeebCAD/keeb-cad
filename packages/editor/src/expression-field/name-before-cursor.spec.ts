import { describe, expect, it } from 'vitest'

import { nameBeforeCursor } from './name-before-cursor'

describe('nameBeforeCursor', () => {
  it.each([
    ['the word ending at the end', '1mm + wa', 8, 'wa'],
    ['the part of a word before a cursor in its middle', 'wall', 2, 'wa'],
    ['a name with digits and _ after its first letter', 'k_2', 3, 'k_2'],
  ])('gives %s', (_role, text, cursor, expected) => {
    expect(nameBeforeCursor(text, cursor)).toBe(expected)
  })

  it.each([
    ['right after an operator', '1mm + ', 6],
    ['after a number, whose letters are its unit', '3mm', 3],
    ['at the start of a word', 'wall', 0],
    ['in empty text', '', 0],
  ])('gives none %s', (_role, text, cursor) => {
    expect(nameBeforeCursor(text, cursor)).toBeUndefined()
  })
})
