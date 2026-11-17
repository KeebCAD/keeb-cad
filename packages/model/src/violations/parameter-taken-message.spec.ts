import { describe, expect, it } from 'vitest'

import { parameterTakenMessage } from './parameter-taken-message'

describe('parameterTakenMessage', () => {
  it('names the taken parameter', () => {
    expect(parameterTakenMessage('x')).toBe('The design already has a parameter named "x".')
  })
})
