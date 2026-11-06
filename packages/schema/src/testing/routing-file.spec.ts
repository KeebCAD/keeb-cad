import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { routingFileSchema } from '../routing-file'
import { aRevision } from './revision'
import { aRoutingFile } from './routing-file'

describe('aRoutingFile', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(routingFileSchema, aRoutingFile()).issues).toBeUndefined()
  })

  it.each([['revision', () => ({ revision: aRevision('r2') })]])(
    'keeps the %s it is given',
    (_field, makeFields) => {
      const fields = makeFields()

      expect(aRoutingFile(fields)).toMatchObject(fields)
    },
  )
})
