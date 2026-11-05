import { expectOk } from '@keeb-cad/result/testing'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { parseKdl } from './parse-kdl'
import { readKdl } from './read-kdl'
import { writeKdl } from './write-kdl'

const leafSchema = v.pipe(
  v.strictObject({ name: v.pipe(v.string(), v.regex(/^[a-z]+$/), v.brand('LeafName')) }),
  v.metadata({ node: 'leaf' }),
)

type Part =
  v.InferOutput<typeof leafSchema> | { axis: 'x' | 'y'; origin?: { x: number }; parts: Part[] }

const partSchema: v.GenericSchema<unknown, Part> = v.lazy((input) =>
  typeof input === 'object' && input !== null && 'axis' in input ? branchSchema : leafSchema,
)

const branchSchema = v.pipe(
  v.strictObject({
    axis: v.picklist(['x', 'y']),
    origin: v.optional(v.strictObject({ x: v.number() })),
    parts: v.pipe(v.array(v.lazy(() => partSchema)), v.metadata({ flatten: true })),
  }),
  v.metadata({ node: 'branch' }),
)

const shapeSchema = v.variant('kind', [
  v.pipe(
    v.object({ kind: v.literal('circle'), radius: v.number() }),
    v.metadata({ node: 'shape' }),
  ),
  v.variant('corner', [
    v.pipe(
      v.strictObject({
        kind: v.literal('square'),
        corner: v.literal('sharp'),
        side: v.pipe(v.number(), v.integer(), v.minValue(1), v.brand('Side')),
      }),
      v.metadata({ node: 'shape' }),
    ),
    v.pipe(
      v.strictObject({ kind: v.literal('square'), corner: v.literal('round'), radius: v.number() }),
      v.metadata({ node: 'shape' }),
    ),
  ]),
])

const kindsSchema = v.strictObject({
  title: v.string(),
  count: v.number(),
  settings: v.object({ colourName: v.picklist(['red', 'blue']), label: v.optional(v.string()) }),
  shape: shapeSchema,
  tree: partSchema,
  shapes: v.array(shapeSchema),
  none: v.array(leafSchema),
  note: v.optional(v.string()),
})

const value = v.parse(kindsSchema, {
  title: 'All "kinds"\n',
  count: 1.5,
  settings: { colourName: 'red', label: 'plain' },
  shape: { kind: 'circle', radius: 2 },
  tree: {
    axis: 'x',
    parts: [{ name: 'near' }, { axis: 'y', origin: { x: -2 }, parts: [{ name: 'far' }] }],
  },
  shapes: [
    { kind: 'square', corner: 'round', radius: 1 },
    { kind: 'square', corner: 'sharp', side: 3 },
    { kind: 'circle', radius: 0.5 },
  ],
  none: [],
})

const text = [
  String.raw`title "All \"kinds\"\n"`,
  'count 1.5',
  'settings colour-name="red" label="plain"',
  'shape kind="circle" radius=2',
  'tree axis="x" {',
  '    leaf name="near"',
  '    branch axis="y" {',
  '        origin x=-2',
  '        leaf name="far"',
  '    }',
  '}',
  'shapes {',
  '    shape kind="square" corner="round" radius=1',
  '    shape kind="square" corner="sharp" side=3',
  '    shape kind="circle" radius=0.5',
  '}',
  'none',
  '',
].join('\n')

describe('the KDL codec over every schema kind it supports', () => {
  it('writes each kind by its rule', () => {
    expect(writeKdl(kindsSchema, value)).toBe(text)
  })

  it('reads what it wrote back to an equal value', () => {
    const document = parseKdl(writeKdl(kindsSchema, value))
    expectOk(document)

    const result = readKdl(kindsSchema, document.value.nodes)

    expectOk(result)
    expect(result.value).toEqual(value)
  })

  it('writes a number in its canonical form, however it was read', () => {
    const schema = v.strictObject({ count: v.number() })
    const document = parseKdl('count 1.50e0\n')
    expectOk(document)
    const result = readKdl(schema, document.value.nodes)
    expectOk(result)

    expect(writeKdl(schema, result.value)).toBe('count 1.5\n')
  })

  it.each([
    ['a boolean schema', v.strictObject({ flag: v.boolean() }), { flag: true }],
    ['a record schema', v.strictObject({ map: v.record(v.string(), v.string()) }), { map: {} }],
  ])('refuses to write %s, which it has no rule for', (_role, schema, input) => {
    expect(() => writeKdl(schema, input)).toThrow(/^The KDL codec has no rule for a /)
  })

  it('refuses to write a list whose item names no node', () => {
    const schema = v.strictObject({ items: v.array(v.strictObject({ id: v.string() })) })

    expect(() => writeKdl(schema, { items: [{ id: 'a' }] })).toThrow(
      'A list item schema names no KDL node.',
    )
  })

  it.each([
    ['no option takes its discriminator', { kind: 'star' }],
    ['no option of a nested variant takes its discriminator', { kind: 'square', corner: 'bevel' }],
  ])('refuses to write a value when %s', (_role, shape) => {
    expect(() => writeKdl(v.strictObject({ shape: shapeSchema }), { shape })).toThrow(
      'No variant of the schema takes the value.',
    )
  })

  it('refuses to write a document whose schema is not an object', () => {
    expect(() => writeKdl(v.string(), 'corne')).toThrow('A string schema is not an object.')
  })

  it('refuses to write a value that is neither a string nor a number', () => {
    expect(() => writeKdl(v.strictObject({ title: v.string() }), { title: true })).toThrow(
      'The KDL codec writes only strings and numbers, not boolean.',
    )
  })

  it('refuses to read a flatten mark on a field that is not a list', () => {
    const schema = v.strictObject({
      group: v.strictObject({ name: v.pipe(v.string(), v.metadata({ flatten: true })) }),
    })
    const document = parseKdl('group\n')
    expectOk(document)

    expect(() => readKdl(schema, document.value.nodes)).toThrow('A string schema is not a list.')
  })
})
