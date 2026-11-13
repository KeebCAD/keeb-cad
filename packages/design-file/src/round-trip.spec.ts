import { expectOk } from '@keeb-cad/result/testing'
import { designSchema, fingerprintsFileSchema, routingFileSchema } from '@keeb-cad/schema'
import { aBlueprintDesignPart, aDesign, aQuantityInputValue } from '@keeb-cad/schema/testing'
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
    String.raw`meta id=corne name="Corne \"wireless\"" default-part=key {`,
    '\tform type=split board=reversible',
    '\tgap x="1mm" y="1mm"',
    '}',
    'library-versions {',
    '\tlibrary-version id="lib:blueprint/choc-key" version=1',
    '}',
    'parts {',
    '\tpart type=blueprint id=key blueprint="lib:blueprint/choc-key" {',
    '\t\tinputs',
    '\t}',
    '}',
    'layout id=root arrangement=free {',
    '\tgroup id=thumbs arrangement=chain axis=x {',
    '\t\tslot id=thumb-near',
    '\t\tslot id=thumb-far {',
    '\t\t\toffset rotation="-15deg" {',
    '\t\t\t\tposition x="-1.037mm" y="2.122mm"',
    '\t\t\t\tpivot x="9mm" y="0mm"',
    '\t\t\t}',
    '\t\t}',
    '\t}',
    '\tgroup id=pinky arrangement=free',
    '\tslot id=encoder {',
    '\t\tanchor type=slot ref=thumb-far attach=edge-top',
    '\t}',
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
      'meta id=corne name=Corne default-part=key {',
      '\tform type=split board=reversible',
      '\tgap x="1mm" y="1mm"',
      '}',
      'library-versions {',
      '\tlibrary-version id="lib:blueprint/choc-key" version=1',
      '}',
      'parts {',
      '\tpart type=blueprint id=key blueprint="lib:blueprint/choc-key" {',
      '\t\tinputs',
      '\t}',
      '}',
    )

    const written = writeBack({ ...canonical, design: layoutFirst })

    expect(written.design).toBe(
      lines(
        'format-version 1',
        'meta id=corne name=Corne default-part=key {',
        '\tform type=split board=reversible',
        '\tgap x="1mm" y="1mm"',
        '}',
        'library-versions {',
        '\tlibrary-version id="lib:blueprint/choc-key" version=1',
        '}',
        'parts {',
        '\tpart type=blueprint id=key blueprint="lib:blueprint/choc-key" {',
        '\t\tinputs',
        '\t}',
        '}',
        'layout id=root arrangement=free',
      ),
    )
  })

  it.each([
    ['a part with empty inputs', {}],
    ['boolean, text and quantity inputs', { flag: true, size: '1u', width: aQuantityInputValue() }],
    ['a kebab-case input key', { 'my-input': '1u' }],
  ])('reproduces %s byte for byte, its keys unchanged', (_role, inputs) => {
    const design = aDesign({ parts: [aBlueprintDesignPart({ inputs })] })
    const written = writeDesignFile(design)

    const migrated = migrateBundle({ design: written })
    expectOk(migrated)

    const reread = v.parse(designSchema, migrated.value.design)
    expect(reread).toEqual(design)
    expect(writeDesignFile(reread)).toBe(written)
  })
})
