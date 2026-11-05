import { writeDesignFile, writeFingerprintsFile, writeRoutingFile } from '@keeb-cad/design-file'
import { designSchema, fingerprintsFileSchema, routingFileSchema } from '@keeb-cad/schema'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { writeBundle } from './write-bundle'

describe('writeBundle', () => {
  it("writes each file of the bundle with that file's writer", () => {
    const bundle = {
      design: v.parse(designSchema, {
        meta: { id: 'corne', name: 'Corne', form: { type: 'split', board: 'reversible' } },
        layout: { id: 'root', arrangement: 'free', children: [] },
      }),
      routing: v.parse(routingFileSchema, { revision: 'r1' }),
      fingerprints: v.parse(fingerprintsFileSchema, { revision: 'r2', fingerprints: [] }),
    }

    expect(writeBundle(bundle)).toEqual({
      design: writeDesignFile(bundle.design),
      routing: writeRoutingFile(bundle.routing),
      fingerprints: writeFingerprintsFile(bundle.fingerprints),
    })
  })
})
