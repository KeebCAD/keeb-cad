import { aSplitForm, aUnibodyForm } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { isSupportedForm } from './is-supported-form'

describe('isSupportedForm', () => {
  it.each([
    ['supports', 'split with board reversible', aSplitForm({ board: 'reversible' }), true],
    ['does not support', 'split with board mirrored', aSplitForm({ board: 'mirrored' }), false],
    ['does not support', 'unibody', aUnibodyForm(), false],
  ])('%s %s', (_outcome, _role, form, expected) => {
    expect(isSupportedForm(form)).toBe(expected)
  })
})
