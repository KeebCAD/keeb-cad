import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { formSchema } from '../form'
import { aForm } from './form'

describe('aForm', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(formSchema, aForm()).issues).toBeUndefined()
  })
})
