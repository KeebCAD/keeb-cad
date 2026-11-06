import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designSchema } from '../design'
import { aDesign } from './design'
import { aLayout, aSlot } from './layout'
import { aMeta } from './meta'

describe('aDesign', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(designSchema, aDesign()).issues).toBeUndefined()
  })

  it.each([
    ['meta', () => ({ meta: aMeta({ name: 'Other' }) })],
    ['layout', () => ({ layout: aLayout({ children: [aSlot()] }) })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aDesign(fields)).toMatchObject(fields)
  })
})
