import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { formatVersionSchema } from '../format-version'
import { aFormatVersion } from './format-version'

describe('aFormatVersion', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(formatVersionSchema, aFormatVersion()).issues).toBeUndefined()
  })
})
