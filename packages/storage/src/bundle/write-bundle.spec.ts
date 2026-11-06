import { writeDesignFile, writeFingerprintsFile, writeRoutingFile } from '@keeb-cad/design-file'
import { revisionSchema } from '@keeb-cad/schema'
import { aDesign, aFingerprintsFile, aRoutingFile } from '@keeb-cad/schema/testing'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { writeBundle } from './write-bundle'

describe('writeBundle', () => {
  it("writes each file of the bundle with that file's writer", () => {
    const bundle = {
      design: aDesign(),
      routing: aRoutingFile(),
      fingerprints: aFingerprintsFile({ revision: v.parse(revisionSchema, 'r2') }),
    }

    expect(writeBundle(bundle)).toEqual({
      design: writeDesignFile(bundle.design),
      routing: writeRoutingFile(bundle.routing),
      fingerprints: writeFingerprintsFile(bundle.fingerprints),
    })
  })
})
