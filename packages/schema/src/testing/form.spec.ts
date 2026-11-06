import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { formSchema } from '../form'
import { aForm, aSplitForm, aUnibodyForm } from './form'

describe('aSplitForm', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(formSchema, aSplitForm()).issues).toBeUndefined()
  })
})

describe('aUnibodyForm', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(formSchema, aUnibodyForm()).issues).toBeUndefined()
  })
})

describe('aForm', () => {
  it.each([
    ['split', aSplitForm],
    ['unibody', aUnibodyForm],
  ] as const)('builds the %s branch with its branch builder', (type, branchBuilder) => {
    expect(aForm(type)).toEqual(branchBuilder())
  })
})
