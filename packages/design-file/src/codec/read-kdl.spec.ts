import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { designSchema, fingerprintsFileSchema, routingFileSchema } from '@keeb-cad/schema'
import type * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { parseKdl } from './parse-kdl'
import { readKdl } from './read-kdl'

const lines = (...text: string[]) => text.join('\n')

function read(schema: v.GenericSchema, text: string) {
  const document = parseKdl(text)
  expectOk(document)
  return readKdl(schema, document.value.nodes)
}

const meta = ['meta id="corne" name="Corne" {', '    form type="split" board="reversible"', '}']
const metaValue = { id: 'corne', name: 'Corne', form: { type: 'split', board: 'reversible' } }

describe('readKdl', () => {
  it('reads an absent flattened list as empty', () => {
    const result = read(designSchema, lines(...meta, 'layout id="root" arrangement="free"'))

    expectOk(result)
    expect(result.value).toEqual({
      meta: metaValue,
      layout: { id: 'root', arrangement: 'free', children: [] },
    })
  })

  it('reads flattened items by node name, a group by its arrangement', () => {
    const result = read(
      designSchema,
      lines(
        ...meta,
        'layout id="root" arrangement="free" {',
        '    group id="thumbs" arrangement="chain" axis="y" {',
        '        slot id="thumb-near"',
        '    }',
        '    slot id="encoder"',
        '}',
      ),
    )

    expectOk(result)
    expect(result.value).toEqual({
      meta: metaValue,
      layout: {
        id: 'root',
        arrangement: 'free',
        children: [
          {
            id: 'thumbs',
            arrangement: 'chain',
            axis: 'y',
            children: [{ id: 'thumb-near' }],
          },
          { id: 'encoder' },
        ],
      },
    })
  })

  it('passes a node its schema has no field for on under its key in camelCase', () => {
    const result = read(
      designSchema,
      lines(
        'meta id="corne" {',
        '    key id="k1"',
        '    default-part id="p1"',
        '}',
        'layout id="root" arrangement="free"',
      ),
    )

    expectOk(result)
    expect(result.value).toEqual({
      meta: { id: 'corne', key: { id: 'k1' }, defaultPart: { id: 'p1' } },
      layout: { id: 'root', arrangement: 'free', children: [] },
    })
  })

  it('passes an unknown top-level node with one argument on as that value', () => {
    const result = read(routingFileSchema, lines('revision "r1"', 'routes-per-board 2'))

    expectOk(result)
    expect(result.value).toEqual({ revision: 'r1', routesPerBoard: 2 })
  })

  it('passes a property its schema has no field for on under its key in camelCase', () => {
    const result = read(
      designSchema,
      lines('layout id="root" arrangement="free" default-part="p1"'),
    )

    expectOk(result)
    expect(result.value).toEqual({
      layout: { id: 'root', arrangement: 'free', defaultPart: 'p1', children: [] },
    })
  })

  it('passes arguments of a node of fields on under their index', () => {
    const result = read(designSchema, lines('meta "corne" "Corne" id="corne"'))

    expectOk(result)
    expect(result.value).toEqual({ meta: { 0: 'corne', 1: 'Corne', id: 'corne' } })
  })

  it('passes a flattened item whose node name is not its kind on under that name', () => {
    const result = read(
      designSchema,
      lines('layout id="root" arrangement="free" {', '    key id="k1"', '}'),
    )

    expectOk(result)
    expect(result.value).toEqual({
      layout: { id: 'root', arrangement: 'free', children: [{ key: { id: 'k1' } }] },
    })
  })

  it('passes a group with an arrangement no variant has on with its fields alone', () => {
    const result = read(
      designSchema,
      lines('layout id="root" arrangement="diagonal" {', '    slot id="a"', '}'),
    )

    expectOk(result)
    expect(result.value).toEqual({
      layout: { id: 'root', arrangement: 'diagonal', slot: { id: 'a' } },
    })
  })

  it('passes a flattened item with an arrangement no variant has on with its fields alone', () => {
    const result = read(
      designSchema,
      lines(
        'layout id="root" arrangement="free" {',
        '    group id="g" arrangement="diagonal"',
        '}',
      ),
    )

    expectOk(result)
    expect(result.value).toEqual({
      layout: {
        id: 'root',
        arrangement: 'free',
        children: [{ id: 'g', arrangement: 'diagonal' }],
      },
    })
  })

  it('reads a node named after the flattened list inside it as an item under that name', () => {
    const result = read(
      designSchema,
      lines('layout id="root" arrangement="free" {', '    children id="a"', '}'),
    )

    expectOk(result)
    expect(result.value).toEqual({
      layout: { id: 'root', arrangement: 'free', children: [{ children: { id: 'a' } }] },
    })
  })

  it('passes a list node holding an argument on as that value', () => {
    const result = read(fingerprintsFileSchema, lines('revision "r1"', 'fingerprints 1'))

    expectOk(result)
    expect(result.value).toEqual({ revision: 'r1', fingerprints: 1 })
  })

  it.each([
    ['a property', lines('revision "r1"', 'note "a" lang="en"'), { 0: 'a', lang: 'en' }],
    [
      'a child node',
      lines('revision "r1"', 'note "a" {', '    lang "en"', '}'),
      { 0: 'a', lang: 'en' },
    ],
  ])(
    'passes an unknown node holding one argument and %s on as its fields',
    (_role, text, expectedNote) => {
      const result = read(routingFileSchema, text)

      expectOk(result)
      expect(result.value).toEqual({ revision: 'r1', note: expectedNote })
    },
  )

  it('passes a list node holding properties on as its fields', () => {
    const result = read(fingerprintsFileSchema, lines('revision "r1"', 'fingerprints count=1'))

    expectOk(result)
    expect(result.value).toEqual({ revision: 'r1', fingerprints: { count: 1 } })
  })

  it('passes a value node holding more than one argument on as its arguments', () => {
    const result = read(routingFileSchema, lines('revision "r1" "r2"'))

    expectOk(result)
    expect(result.value).toEqual({ revision: { 0: 'r1', 1: 'r2' } })
  })

  it('refuses a child node that repeats a property of its parent, naming it and both lines', () => {
    const result = read(designSchema, lines('meta id="a" name="A" {', '    id "b"', '}'))

    expectErr(result)
    expect(result.error).toBe('The field "id" is both a property and a node, on lines 1 and 2.')
  })

  it('refuses a property named after the flattened list, naming it and its line', () => {
    const result = read(
      designSchema,
      lines('layout id="root" arrangement="free" children="x" {', '    slot id="a"', '}'),
    )

    expectErr(result)
    expect(result.error).toBe(
      'The field "children" is both a property and a list of nodes, on line 1.',
    )
  })

  it.each([
    ['a field', routingFileSchema, lines('revision "r1"', 'revision "r2"'), 'revision', 1, 2],
    [
      'a node its schema has no field for',
      routingFileSchema,
      lines('note "a"', 'revision "r1"', 'note "b"'),
      'note',
      1,
      3,
    ],
    [
      'a nested node',
      designSchema,
      lines('meta {', '    form type="unibody"', '    form type="unibody"', '}'),
      'form',
      2,
      3,
    ],
  ])(
    'refuses %s repeated, naming it and both lines',
    (_role, schema, text, node, first, second) => {
      const result = read(schema, text)

      expectErr(result)
      expect(result.error).toBe(
        `The node "${node}" appears more than once, on lines ${first} and ${second}.`,
      )
    },
  )
})
