import { describe, expect, it } from 'vitest'

import { hash } from './hash'

describe('hash', () => {
  it('is the SHA-256 hex digest of the canonical encoding', () => {
    expect(hash({ b: [true, null, 'x'], a: 1 })).toBe(
      'eca8cfb31ab74533e1eb2f4c74d2d55dfe3c79ac704787e54be8647ea7777eb1',
    )
  })

  it('ignores key order', () => {
    expect(hash({ a: 1, b: 2 })).toBe(hash({ b: 2, a: 1 }))
  })
})
