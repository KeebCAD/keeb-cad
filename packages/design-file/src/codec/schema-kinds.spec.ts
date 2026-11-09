import { expectErr, expectOk } from '@keeb-cad/result/testing'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { parseKdl } from './parse-kdl'
import { readKdl } from './read-kdl'
import { recordValue } from './schema-fields'
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
  enabled: v.boolean(),
  mixed: v.union([v.string(), v.number()]),
  inputs: v.record(
    v.string(),
    v.union([
      v.boolean(),
      v.string(),
      v.strictObject({ type: v.literal('quantity'), value: v.string() }),
    ]),
  ),
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
  enabled: true,
  mixed: 'either',
  inputs: {
    'my-input': false,
    size: '1u',
    width: { type: 'quantity', value: '18mm' },
  },
})

const text = [
  String.raw`title "All \"kinds\"\n"`,
  'count 1.5',
  'settings colour-name=red label=plain',
  'shape kind=circle radius=2',
  'tree axis=x {',
  '\tleaf name=near',
  '\tbranch axis=y {',
  '\t\torigin x=-2',
  '\t\tleaf name=far',
  '\t}',
  '}',
  'shapes {',
  '\tshape kind=square corner=round radius=1',
  '\tshape kind=square corner=sharp side=3',
  '\tshape kind=circle radius=0.5',
  '}',
  'none',
  'enabled #true',
  'mixed either',
  'inputs {',
  '\tmy-input #false',
  '\tsize "1u"',
  '\twidth type=quantity value="18mm"',
  '}',
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
    ['an identifier, bare', 'thumb-near', 'name thumb-near\n'],
    ['a string led by a digit, quoted', '19mm', 'name "19mm"\n'],
    ['a string led by a sign and a digit, quoted', '-15deg', 'name "-15deg"\n'],
    ['a string with a space, quoted', 'wall + gap', 'name "wall + gap"\n'],
    ['a keyword, quoted', 'true', 'name "true"\n'],
    ['the empty string, quoted', '', 'name ""\n'],
  ])('writes %s', (_role, name, expected) => {
    expect(writeKdl(v.strictObject({ name: v.string() }), { name })).toBe(expected)
  })

  it.each([
    ['a tuple schema', v.strictObject({ pair: v.tuple([v.string()]) }), { pair: ['a'] }],
    ['a bigint schema', v.strictObject({ big: v.bigint() }), { big: 1n }],
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

  it('refuses to write a value that is not a string, number or boolean', () => {
    expect(() => writeKdl(v.strictObject({ title: v.string() }), { title: {} })).toThrow(
      'The KDL codec writes only strings, numbers and booleans, not object.',
    )
  })

  it('writes record entries in compareId order, however they were given', () => {
    const schema = v.strictObject({ map: v.record(v.string(), v.string()) })

    expect(writeKdl(schema, { map: { b: 'x', B: 'y', a: 'z' } })).toBe(
      'map {\n\tB y\n\ta z\n\tb x\n}\n',
    )
  })

  it('refuses a non-record schema read as one', () => {
    expect(() => recordValue(v.string())).toThrow('A string schema is not a record.')
  })

  it('writes a union entry by the object option that takes it', () => {
    const schema = v.strictObject({
      map: v.record(
        v.string(),
        v.union([v.strictObject({ a: v.string() }), v.strictObject({ b: v.string() })]),
      ),
    })

    expect(writeKdl(schema, { map: { k: { b: 'x' } } })).toBe('map {\n\tk b=x\n}\n')
  })

  it('refuses a union entry no object option takes', () => {
    const schema = v.strictObject({
      map: v.record(v.string(), v.union([v.strictObject({ a: v.string() })])),
    })

    expect(() => writeKdl(schema, { map: { k: { c: 'x' } } })).toThrow(
      'No variant of the schema takes the value.',
    )
  })

  it('refuses a null record value as a value it cannot write', () => {
    const schema = v.strictObject({ map: v.record(v.string(), v.string()) })

    expect(() => writeKdl(schema, { map: { k: null } })).toThrow(
      'The KDL codec writes only strings, numbers and booleans, not object.',
    )
  })

  it.each([
    ['an argument and a property', 'k "x" b=1', { k: { 0: 'x', b: 1 } }],
    ['nothing', 'k', { k: {} }],
  ])('reads a record entry holding %s as its fields', (_role, entry, expected) => {
    const schema = v.strictObject({ map: v.record(v.string(), v.union([v.string()])) })
    const document = parseKdl(`map {\n\t${entry}\n}\n`)
    expectOk(document)

    const result = readKdl(schema, document.value.nodes)

    expectOk(result)
    expect(result.value).toEqual({ map: expected })
  })

  it.each([
    ['a property', 'map x=y\n'],
    ['an argument', 'map "x"\n'],
  ])('refuses a record node with %s, naming it and its line', (_role, text) => {
    const schema = v.strictObject({ map: v.record(v.string(), v.string()) })
    const document = parseKdl(text)
    expectOk(document)

    const result = readKdl(schema, document.value.nodes)

    expectErr(result)
    expect(result.error).toBe('The record "map" holds only child nodes, on line 1.')
  })

  it('passes a record entry with an argument and a child on for the schema to refuse', () => {
    const schema = v.strictObject({ map: v.record(v.string(), v.union([v.string()])) })
    const document = parseKdl('map {\n\tsize "1u" {\n\t\tjunk\n\t}\n}\n')
    expectOk(document)

    const result = readKdl(schema, document.value.nodes)

    expectOk(result)
    expect(v.safeParse(schema, result.value).success).toBe(false)
  })

  it('refuses a key repeated in a record', () => {
    const schema = v.strictObject({ map: v.record(v.string(), v.string()) })
    const document = parseKdl('map {\n\ta x\n\ta y\n}\n')
    expectOk(document)

    const result = readKdl(schema, document.value.nodes)

    expectErr(result)
    expect(result.error).toBe('The node "a" appears more than once, on lines 2 and 3.')
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
