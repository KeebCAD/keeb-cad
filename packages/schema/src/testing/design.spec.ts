import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designSchema } from '../design'
import { aDesign } from './design'
import { aBlueprintDesignPart } from './design-part'
import { aLayout, aSlot } from './layout'
import { aLibraryVersion } from './library-version'
import { anId } from './id'
import { aMeta } from './meta'
import { aParameter } from './parameter'
import { aSidePartOverride } from './override'
import { aVersion } from './version'

describe('aDesign', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(designSchema, aDesign()).issues).toBeUndefined()
  })

  it.each([
    ['meta', () => ({ meta: aMeta({ name: 'Other' }) })],
    ['parameters', () => ({ parameters: [aParameter()] })],
    ['libraryVersions', () => ({ libraryVersions: [aLibraryVersion({ version: aVersion(2) })] })],
    ['parts', () => ({ parts: [aBlueprintDesignPart({ id: anId('other') })] })],
    ['layout', () => ({ layout: aLayout({ children: [aSlot()] }) })],
    ['overrides', () => ({ overrides: [aSidePartOverride()] })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aDesign(fields)).toMatchObject(fields)
  })
})
