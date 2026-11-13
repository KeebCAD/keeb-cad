import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { ref } from './ref'

describe('ref', () => {
  it.each([
    ['library-part', 'lib:part/x'],
    ['library-blueprint', 'lib:blueprint/x'],
    ['design-part', 'my-part'],
    ['slot', 'thumb-near'],
    ['group', 'thumbs'],
  ] as const)('marks a %s reference with its kind and accepts its target id', (kind, input) => {
    const schema = ref(kind as 'design-part')

    expect(v.getMetadata(schema)).toEqual({ refKind: kind })
    expect(v.safeParse(schema, input).success).toBe(true)
  })

  it('refuses a value that is not its target id', () => {
    expect(v.safeParse(ref('library-part'), 'my-part').success).toBe(false)
  })
})
