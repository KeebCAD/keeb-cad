import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { metaSchema } from '../meta'
import { aUnibodyForm } from './form'
import { anId } from './id'
import { aMeta } from './meta'

describe('aMeta', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(metaSchema, aMeta()).issues).toBeUndefined()
  })

  it.each([
    ['id', () => ({ id: anId('other') })],
    ['name', () => ({ name: 'Other' })],
    ['form', () => ({ form: aUnibodyForm() })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aMeta(fields)).toMatchObject(fields)
  })
})
