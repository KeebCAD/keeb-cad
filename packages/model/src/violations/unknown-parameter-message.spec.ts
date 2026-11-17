import { describe, expect, it } from 'vitest'

import { unknownParameterMessage } from './unknown-parameter-message'

describe('unknownParameterMessage', () => {
  it('names the missing parameter', () => {
    expect(unknownParameterMessage('x')).toBe('The design has no parameter named "x".')
  })
})
