import { describe, expect, it } from 'vitest'

import { commonText } from './common-text'

describe('commonText', () => {
  it.each([
    ['the text every entry shows', ['1mm', '1mm'], '1mm'],
    ['none for entries that differ', ['1mm', '2mm'], undefined],
    ['none for no entries', [], undefined],
  ])('gives %s', (_role, texts, expected) => {
    expect(commonText(texts)).toBe(expected)
  })
})
