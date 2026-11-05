import { routingFileSchema } from '@keeb-cad/schema'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { writeRoutingFile } from './write-routing-file'

describe('writeRoutingFile', () => {
  it('writes an empty routing file as its revision node alone', () => {
    const routing = v.parse(routingFileSchema, { revision: 'r1' })

    expect(writeRoutingFile(routing)).toBe('revision "r1"\n')
  })
})
