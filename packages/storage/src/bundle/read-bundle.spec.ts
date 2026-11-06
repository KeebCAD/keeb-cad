import { expectOk } from '@keeb-cad/result/testing'
import { revisionSchema } from '@keeb-cad/schema'
import { aDesign, aFingerprintsFile, aRoutingFile } from '@keeb-cad/schema/testing'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { readBundle } from './read-bundle'

const designText =
  'format-version 1\nmeta id="corne" name="Corne" {\n    form type="split" board="reversible"\n}\nlayout id="root" arrangement="free"\n'

describe('readBundle', () => {
  it('reads each text as its own file of the bundle', () => {
    const result = readBundle({
      design: designText,
      routing: 'revision "r1"\n',
      fingerprints: 'revision "r2"\nfingerprints\n',
    })

    expectOk(result)
    expect(result.value).toEqual({
      design: aDesign(),
      routing: aRoutingFile(),
      fingerprints: aFingerprintsFile({ revision: v.parse(revisionSchema, 'r2') }),
      unreadable: [],
    })
  })

  it('reads a design text alone as a bundle with no derived files', () => {
    const result = readBundle({ design: designText })

    expectOk(result)
    expect(result.value).toEqual({ design: aDesign(), unreadable: [] })
  })
})
