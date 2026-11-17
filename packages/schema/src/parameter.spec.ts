import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { parameterSchema } from './parameter'

describe('parameterSchema', () => {
  it('refuses an empty value, at the value', () => {
    expect(v.safeParse(parameterSchema, { name: 'wall', value: '' })).toMatchObject({
      success: false,
      issues: [{ path: [{ key: 'value' }], message: 'Not an expression.' }],
    })
  })

  it('accepts a value that names other parameters', () => {
    expect(v.safeParse(parameterSchema, { name: 'wall', value: 'gap * 2' }).success).toBe(true)
  })

  it('names its file node parameter', () => {
    expect(v.getMetadata(parameterSchema)).toEqual({ node: 'parameter' })
  })
})
