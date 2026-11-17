import { InvariantError } from '@keeb-cad/result'
import * as v from 'valibot'

import type { Path, SchemaMetadata, SchemaValue, WalkedSchema } from './types'

// Every value under `value` whose schema declares a reference, an expression or a unit, found by
// walking the schema beside the value, so no section needs code of its own.
export function* walkSchema(
  schema: v.GenericSchema,
  value: unknown,
  path: Path = [],
): Generator<SchemaValue> {
  if (value === undefined) return
  const metadata = v.getMetadata(schema) as SchemaMetadata
  if (
    metadata.refKind !== undefined ||
    metadata.expression === true ||
    metadata.unit !== undefined
  ) {
    yield { path, metadata, value }
    return
  }
  const walked = schema as unknown as WalkedSchema
  switch (walked.type) {
    case 'optional':
    case 'nullable': {
      yield* walkSchema(walked.wrapped as v.GenericSchema, value, path)
      return
    }
    case 'object':
    case 'strict_object': {
      const fields = value as Record<string, unknown>
      for (const [key, entry] of Object.entries(walked.entries ?? {})) {
        yield* walkSchema(entry, fields[key], [...path, key])
      }
      return
    }
    case 'array': {
      for (const [index, item] of (value as unknown[]).entries()) {
        yield* walkSchema(walked.item as v.GenericSchema, item, [...path, index])
      }
      return
    }
    case 'record': {
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        yield* walkSchema(walked.value as v.GenericSchema, entry, [...path, key])
      }
      return
    }
    case 'lazy': {
      yield* walkSchema((walked.getter as (input: unknown) => v.GenericSchema)(value), value, path)
      return
    }
    case 'variant':
    case 'union': {
      const option = (walked.options ?? []).find((candidate) => v.is(candidate, value))
      if (option !== undefined) yield* walkSchema(option, value, path)
      return
    }
    case 'string':
    case 'number':
    case 'boolean':
    case 'literal':
    case 'picklist': {
      return
    }
    default: {
      throw new InvariantError(`The schema walk has no rule for a ${walked.type} schema.`)
    }
  }
}
