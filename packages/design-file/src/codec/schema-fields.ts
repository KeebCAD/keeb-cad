import { InvariantError } from '@keeb-cad/result'
import * as v from 'valibot'

import type { CodecSchema, FieldForm, FieldMetadata, Fields, ObjectLikeSchema } from './types'

const supported = new Set<string>([
  'optional',
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
  const codecSchema = codecSchemaOf(schema)
  switch (codecSchema.type) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'literal':
    case 'picklist':
    case 'union': {
      return 'value'
    }
    case 'record': {
      return 'record'
    }
    case 'array': {
      return 'list'
    }
    default: {
      return 'object'
    }
  }
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
  const codecSchema = codecSchemaOf(schema)
  switch (codecSchema.type) {
    case 'lazy': {
      return resolveObject(codecSchema.getter(value), value)
    }
    case 'variant': {
      return codecSchema.options
        .map((option) => resolveObject(option as v.GenericSchema, value))
        .find(
          (option) =>
            option !== undefined &&
            // Every variant option defines its discriminator.
            v.is(option.entries[codecSchema.key] as v.GenericSchema, value[codecSchema.key]),
        )
    }
    case 'union': {
      return codecSchema.options
        .filter((option) => fieldForm(option as v.GenericSchema) === 'object')
        .map((option) => resolveObject(option as v.GenericSchema, value))
        .find((option) => option !== undefined && v.is(option, value))
    }
    case 'object':
    case 'strict_object': {
      return codecSchema
    }
    default: {
      throw new InvariantError(`A ${codecSchema.type} schema is not an object.`)
    }
  }
}

// Optional fields are written and read like the schema they wrap; an absent one is omitted.
function codecSchemaOf(schema: v.GenericSchema): Exclude<CodecSchema, { type: 'optional' }> {
  const codecSchema = schema as CodecSchema
  if (!supported.has(codecSchema.type)) {
    throw new InvariantError(`The KDL codec has no rule for a ${codecSchema.type} schema.`)
  }
  return codecSchema.type === 'optional' ? codecSchemaOf(codecSchema.wrapped) : codecSchema
}
