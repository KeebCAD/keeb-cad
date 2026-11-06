import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { routingFileSchema } from '../routing-file'
import { aRoutingFile } from './routing-file'

describe('aRoutingFile', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(routingFileSchema, aRoutingFile()).issues).toBeUndefined()
  })
})
