import { describe, expect, it } from 'vitest'

import { vmHasOutgrown } from './vm-has-outgrown'

const REPLACEMENT_LIMIT = 48 * 1024 * 1024
const WASM_PAGE = 64 * 1024

describe('vmHasOutgrown', () => {
  it.each([
    ['one page below the limit', REPLACEMENT_LIMIT - WASM_PAGE, false],
    ['on the limit', REPLACEMENT_LIMIT, false],
    ['one page above the limit', REPLACEMENT_LIMIT + WASM_PAGE, true],
  ])('%s', (_role, bytes, expected) => {
    expect(vmHasOutgrown(bytes)).toBe(expected)
  })
})
