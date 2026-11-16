import { InvariantError } from '@keeb-cad/result'
import { match, P } from 'ts-pattern'
import * as v from 'valibot'

import type { CodecSchema, FieldForm, FieldMetadata, Fields, ObjectLikeSchema } from './types'

const supported = new Set<string>([
  'optional',
  'nullable',
  'string',
  'number',
  'boolean',
  'literal',
  'picklist',
  'object',
  'strict_object',
  'variant',
  'lazy',
  'array',
  'union',
  'record',
])

// What the codec reads from a schema. An unsupported kind throws, so a Valibot upgrade that
// changes schema internals fails loudly rather than writing a different file.
export function fieldForm(schema: v.GenericSchema): FieldForm {
  return match(codecSchemaOf(schema).type)
    .returnType<FieldForm>()
    .with('string', 'number', 'boolean', 'literal', 'picklist', 'union', () => 'value')
    .with('record', () => 'record')
    .with('array', () => 'list')
    .otherwise(() => 'object')
}

export function fieldMetadata(schema: v.GenericSchema): FieldMetadata {
  return v.getMetadata(codecSchemaOf(schema) as v.GenericSchema) as FieldMetadata
}

export function listItem(schema: v.GenericSchema): v.GenericSchema {
  const codecSchema = codecSchemaOf(schema)
  if (codecSchema.type !== 'array') {
    throw new InvariantError(`A ${codecSchema.type} schema is not a list.`)
  }
  return codecSchema.item
}

export function recordValue(schema: v.GenericSchema): v.GenericSchema {
  const codecSchema = codecSchemaOf(schema)
  if (codecSchema.type !== 'record') {
    throw new InvariantError(`A ${codecSchema.type} schema is not a record.`)
  }
  return codecSchema.value
}

// The object schema an object field's value is read or written with: a lazy schema chooses by the
// value, a variant by its discriminator. Undefined when no variant takes the value.
export function resolveObject(
  schema: v.GenericSchema,
  value: Fields,
): ObjectLikeSchema | undefined {
  return match(codecSchemaOf(schema))
    .returnType<ObjectLikeSchema | undefined>()
    .with({ type: 'lazy' }, (lazy) => resolveObject(lazy.getter(value), value))
    .with({ type: 'variant' }, (variant) =>
      variant.options
        .map((option) => resolveObject(option as v.GenericSchema, value))
        .find(
          (option) =>
            option !== undefined &&
            // Every variant option defines its discriminator.
            v.is(option.entries[variant.key] as v.GenericSchema, value[variant.key]),
        ),
    )
    .with({ type: 'union' }, (union) =>
      union.options
        .filter((option) => fieldForm(option as v.GenericSchema) === 'object')
        .map((option) => resolveObject(option as v.GenericSchema, value))
        .find((option) => option !== undefined && v.is(option, value)),
    )
    .with({ type: P.union('object', 'strict_object') }, (object) => object)
    .otherwise((other) => {
      throw new InvariantError(`A ${other.type} schema is not an object.`)
    })
}

// Whether a field's schema lets its value be null, which the codec then writes as KDL's null.
export function isNullable(schema: v.GenericSchema): boolean {
  return checkedSchema(schema).type === 'nullable'
}

// Optional and nullable fields are written and read like the schema they wrap; an absent
// optional one is omitted.
function codecSchemaOf(
  schema: v.GenericSchema,
): Exclude<CodecSchema, { type: 'optional' | 'nullable' }> {
  const codecSchema = checkedSchema(schema)
  return codecSchema.type === 'optional' || codecSchema.type === 'nullable'
    ? codecSchemaOf(codecSchema.wrapped)
    : codecSchema
}

function checkedSchema(schema: v.GenericSchema): CodecSchema {
  const codecSchema = schema as CodecSchema
  if (!supported.has(codecSchema.type)) {
    throw new InvariantError(`The KDL codec has no rule for a ${codecSchema.type} schema.`)
  }
  return codecSchema
}
