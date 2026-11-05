import { describe, expect, it } from 'vitest'

import { mintId } from './mint-id'

const expectedShape = /^[a-z0-9]{12}$/

describe('mintId', () => {
  it('mints twelve lowercase letters or digits, different on each call', () => {
    const first = mintId()
    const second = mintId()

    expect([first, second]).toEqual([
      expect.stringMatching(expectedShape),
      expect.stringMatching(expectedShape),
    ])
    expect(first).not.toBe(second)
  })
})
