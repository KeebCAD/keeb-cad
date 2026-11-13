import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { unsupportedFormMessage } from './unsupported-form-message'
import { unsupportedFormViolation } from './unsupported-form-violation'

describe('unsupportedFormViolation', () => {
  it('reports the design as an error with no fix', () => {
    const design = anId('d')

    expect(unsupportedFormViolation(design)).toEqual({
      kind: 'unsupported-form',
      severity: 'error',
      ids: [design],
      message: unsupportedFormMessage([design]),
      fixes: [],
    })
  })
})
