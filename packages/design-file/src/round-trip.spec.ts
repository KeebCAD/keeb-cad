import { expectOk } from '@keeb-cad/result/testing'
import { designSchema, fingerprintsFileSchema, routingFileSchema } from '@keeb-cad/schema'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { writeDesignFile } from './design-file/write-design-file'
import { writeFingerprintsFile } from './fingerprints-file/write-fingerprints-file'
import { migrateBundle } from './migrate-bundle'
import { writeRoutingFile } from './routing-file/write-routing-file'

const lines = (...text: string[]) => text.map((line) => `${line}\n`).join('')

const canonical = {
  design: lines(
    'format-version 1',
    String.raw`meta id=corne name="Corne \"wireless\"" {`,
    '\tform type=split board=reversible',
    '}',
    'layout id=root arrangement=free {',
    '\tgroup id=thumbs arrangement=chain axis=x {',
    '\t\tslot id=thumb-near',
    '\t\tslot id=thumb-far',
    '\t}',
    '\tgroup id=pinky arrangement=free',
    '\tslot id=encoder',
    '}',
  ),
  routing: lines('revision r1'),
  fingerprints: lines(
    'revision r1',
    'fingerprints {',
    '\tfingerprint id=choc-key slice=slice-hash outputs=outputs-hash',
    '}',
  ),
}

function writeBack(raw: { design: string; routing?: string; fingerprints?: string }) {
  const migrated = migrateBundle(raw)
  expectOk(migrated)
  return {
    design: writeDesignFile(v.parse(designSchema, migrated.value.design)),
    routing: writeRoutingFile(v.parse(routingFileSchema, migrated.value.routing)),
    fingerprints: writeFingerprintsFile(
      v.parse(fingerprintsFileSchema, migrated.value.fingerprints),
    ),
  }
}

describe('a bundle read and written back', () => {
  it('reproduces each canonical file byte for byte', () => {
    expect(writeBack(canonical)).toEqual(canonical)
  })

  it('writes the sections in their order, whatever order it read them in', () => {
    const layoutFirst = lines(
      'format-version 1',
      'layout id=root arrangement=free',
      'meta id=corne name=Corne {',
      '\tform type=split board=reversible',
      '}',
    )

    const written = writeBack({ ...canonical, design: layoutFirst })

    expect(written.design).toBe(
      lines(
        'format-version 1',
        'meta id=corne name=Corne {',
        '\tform type=split board=reversible',
        '}',
        'layout id=root arrangement=free',
      ),
    )
  })
})
