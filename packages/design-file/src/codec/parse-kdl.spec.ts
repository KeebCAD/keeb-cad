import { expectErr } from '@keeb-cad/result/testing'
import { describe, expect, it } from 'vitest'

import { parseKdl } from './parse-kdl'

describe('parseKdl', () => {
  it("gives each error the reader reports on its own line, with the reader's line and column", () => {
    const result = parseKdl('size 0x 0x\n')

    expectErr(result)
    expect(result.error).toBe(
      'Invalid hexadecimal number at 1:6\nInvalid hexadecimal number at 1:9',
    )
  })
})
