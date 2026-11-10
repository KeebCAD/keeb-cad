import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { metaSchema } from '../meta'
import { aUnibodyForm } from './form'
import { aGap } from './gap'
import { anId } from './id'
import { aLength } from './length'
import { aMeta } from './meta'
import { aPartRef } from './part-ref'

describe('aMeta', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(metaSchema, aMeta()).issues).toBeUndefined()
  })

  it.each([
    ['id', () => ({ id: anId('other') })],
    ['name', () => ({ name: 'Other' })],
    ['form', () => ({ form: aUnibodyForm() })],
    ['defaultPart', () => ({ defaultPart: aPartRef('other') })],
    ['gap', () => ({ gap: aGap({ y: aLength('2mm') }) })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aMeta(fields)).toMatchObject(fields)
  })
})
