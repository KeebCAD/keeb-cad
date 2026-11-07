import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { aDesign, aMeta } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkDesign } from './parse-design'

describe('checkDesign', () => {
  it('takes a design that parses', () => {
    expectOk(checkDesign({ design: aDesign(), unreadable: [] }))
  })

  it('refuses a design that fails its schema, at the path from the design root', () => {
    const design = { ...aDesign(), meta: { ...aMeta(), id: 'Corne' } }

    const checked = checkDesign({ design, unreadable: [] })

    expectErr(checked)
    expect(checked.error).toEqual({
      kind: 'design-invalid',
      issues: [{ path: ['meta', 'id'], message: expect.any(String) }],
    })
  })
})
