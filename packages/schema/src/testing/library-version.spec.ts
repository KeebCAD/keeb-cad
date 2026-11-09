import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { libraryVersionSchema } from '../library-version'
import { aLibraryId } from './library-id'
import { aLibraryVersion } from './library-version'
import { aVersion } from './version'

describe('aLibraryVersion', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(libraryVersionSchema, aLibraryVersion()).issues).toBeUndefined()
  })

  it.each([
    ['id', () => ({ id: aLibraryId('lib:part/x') })],
    ['version', () => ({ version: aVersion(2) })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aLibraryVersion(fields)).toMatchObject(fields)
  })
})
