import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { workspaceSchema } from './workspace'

describe('workspaceSchema', () => {
  it('lists the workspaces in tab order', () => {
    expect(workspaceSchema.options).toEqual(['layout', 'outline', 'pcb', 'case', 'firmware'])
  })

  it('refuses a slug it does not list', () => {
    expect(v.safeParse(workspaceSchema, 'bogus').success).toBe(false)
  })
})
