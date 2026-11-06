import { describe, expect, it } from 'vitest'

import { anId } from './id'

describe('anId', () => {
  it('returns its argument as an id', () => {
    expect(anId('a-b')).toBe('a-b')
  })
})
