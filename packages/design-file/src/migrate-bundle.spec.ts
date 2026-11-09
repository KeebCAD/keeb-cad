import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { aDesign, aFingerprintsFile, aRoutingFile } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { migrateBundle } from './migrate-bundle'

const lines = (...text: string[]) => text.map((line) => `${line}\n`).join('')

const sections = [
  'meta id="corne" name="Corne" default-part="key" {',
  '    form type="split" board="reversible"',
  '}',
  'library-versions {',
  '    library-version id="lib:blueprint/choc-key" version=1',
  '}',
  'parts {',
  '    part type="blueprint" id="key" blueprint="lib:blueprint/choc-key" {',
  '        inputs',
  '    }',
  '}',
  'layout id="root" arrangement="free"',
]

const routingText = lines('revision "r1"')
const fingerprintsText = lines('revision "r1"', 'fingerprints')

describe('migrateBundle', () => {
  describe('the format-version node', () => {
    it('opens a design on the current version, with the node stripped', () => {
      const result = migrateBundle({ design: lines('format-version 1', ...sections) })

      expectOk(result)
      expect(result.value).toEqual({ design: aDesign(), unreadable: [] })
    })

    it('refuses a version below the first as unreadable', () => {
      const result = migrateBundle({ design: lines('format-version 0', ...sections) })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'file-unreadable',
        file: 'design',
        message: 'The format-version node holds no whole number of at least 1.',
      })
    })

    it('refuses a version above the current as too new, naming it', () => {
      const result = migrateBundle({ design: lines('format-version 2', ...sections) })

      expectErr(result)
      expect(result.error).toEqual({ kind: 'format-too-new', found: 2 })
    })

    it.each([
      ['a property beside the version', 'format-version 1 extra=1'],
      ['a second argument', 'format-version 1 2'],
      ['a child node', 'format-version 1 {\n    patch 1\n}'],
      ['no argument', 'format-version'],
    ])('refuses a node with %s as unreadable', (_role, versionText) => {
      const result = migrateBundle({ design: lines(versionText, ...sections) })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'file-unreadable',
        file: 'design',
        message: 'The format-version node holds no whole number of at least 1.',
      })
    })

    it('refuses a design file with no format-version node as unreadable', () => {
      const result = migrateBundle({ design: lines(...sections) })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'file-unreadable',
        file: 'design',
        message: 'The design file has no format-version node.',
      })
    })

    it('refuses a design file with two format-version nodes as unreadable', () => {
      const result = migrateBundle({
        design: lines('format-version 1', ...sections, 'format-version 1'),
      })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'file-unreadable',
        file: 'design',
        message: 'The design file has more than one format-version node.',
      })
    })

    it('refuses an empty design file as unreadable', () => {
      const result = migrateBundle({ design: '' })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'file-unreadable',
        file: 'design',
        message: 'The design file has no format-version node.',
      })
    })
  })

  describe('the design file', () => {
    it("refuses a design file that is not KDL as unreadable, with the reader's line and column", () => {
      const result = migrateBundle({
        design: lines('format-version 1', 'meta id="corne"', 'layout id="root" arrangement='),
      })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'file-unreadable',
        file: 'design',
        message: 'Expected a value at 3:30',
      })
    })

    it('refuses a bundle with no design file as unreadable', () => {
      const result = migrateBundle({ routing: routingText, fingerprints: fingerprintsText })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'file-unreadable',
        file: 'design',
        message: 'The bundle has no design file.',
      })
    })

    it('refuses a repeated section as unreadable, naming it and the lines of both', () => {
      const result = migrateBundle({
        design: lines('format-version 1', ...sections, 'meta id="corne-v2"'),
      })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'file-unreadable',
        file: 'design',
        message: 'The node "meta" appears more than once, on lines 2 and 14.',
      })
    })
  })

  it('refuses a design file whose field is both a property and a node as unreadable', () => {
    const result = migrateBundle({
      design: lines(
        'format-version 1',
        'meta id="corne" name="Corne" {',
        '    form type="split" board="reversible"',
        '    id "corne-v2"',
        '}',
        'layout id="root" arrangement="free"',
      ),
    })

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'file-unreadable',
      file: 'design',
      message: 'The field "id" is both a property and a node, on lines 2 and 4.',
    })
  })

  describe('the derived files', () => {
    it('reads both derived files as values', () => {
      const result = migrateBundle({
        design: lines('format-version 1', ...sections),
        routing: routingText,
        fingerprints: fingerprintsText,
      })

      expectOk(result)
      expect(result.value).toEqual({
        design: aDesign(),
        routing: aRoutingFile(),
        fingerprints: aFingerprintsFile(),
        unreadable: [],
      })
    })

    it.each([
      [
        'routing',
        { routing: 'revision "a', fingerprints: fingerprintsText },
        () => ({ fingerprints: aFingerprintsFile(), unreadable: ['routing'] }),
      ],
      [
        'fingerprints',
        { routing: routingText, fingerprints: 'revision "a' },
        () => ({ routing: aRoutingFile(), unreadable: ['fingerprints'] }),
      ],
    ])(
      'lists a %s file that is not KDL as unreadable and passes it on as absent',
      (_file, derived, expectedDerived) => {
        const result = migrateBundle({ design: lines('format-version 1', ...sections), ...derived })

        expectOk(result)
        expect(result.value).toEqual({ design: aDesign(), ...expectedDerived() })
      },
    )

    it('lists a derived file with a repeated node as unreadable', () => {
      const result = migrateBundle({
        design: lines('format-version 1', ...sections),
        routing: lines('revision "r1"', 'revision "r2"'),
      })

      expectOk(result)
      expect(result.value).toEqual({ design: aDesign(), unreadable: ['routing'] })
    })

    it('passes an absent derived file on as absent, not unreadable', () => {
      const result = migrateBundle({
        design: lines('format-version 1', ...sections),
        routing: routingText,
      })

      expectOk(result)
      expect(result.value).toEqual({ design: aDesign(), routing: aRoutingFile(), unreadable: [] })
    })
  })
})
