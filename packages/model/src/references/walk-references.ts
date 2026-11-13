import { InvariantError } from '@keeb-cad/result'
import { designSchema, type Design, type Frozen, type Node, nodeSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

import type { Path, Reference, ReferenceMetadata, WalkedSchema } from './types'

// Every declared reference in the design, found by walking its schema beside its value, so no
// section needs code of its own.
export function walkReferences(design: Frozen<Design>): Generator<Reference> {
  return walk(designSchema, design, [])
}

// The same walk over one layout node, paths starting at that node.
export function walkNodeReferences(node: Frozen<Node>): Generator<Reference> {
  return walk(nodeSchema, node, [])
}

function* walk(schema: v.GenericSchema, value: unknown, path: Path): Generator<Reference> {
  if (value === undefined) return
  const metadata = v.getMetadata(schema) as ReferenceMetadata
  if (metadata.refKind !== undefined) {
    yield { path, kind: metadata.refKind, target: value as string }
    return
  }
  // A literal names no parameter; only a grammar with names adds parameter references.
  if (metadata.expression === true) return
  const walked = schema as unknown as WalkedSchema
  switch (walked.type) {
    case 'optional':
    case 'nullable': {
      yield* walk(walked.wrapped as v.GenericSchema, value, path)
      return
    }
    case 'object':
    case 'strict_object': {
      const fields = value as Record<string, unknown>
      for (const [key, entry] of Object.entries(walked.entries ?? {})) {
        yield* walk(entry, fields[key], [...path, key])
      }
      return
    }
    case 'array': {
      for (const [index, item] of (value as unknown[]).entries()) {
        yield* walk(walked.item as v.GenericSchema, item, [...path, index])
      }
      return
    }
    case 'record': {
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        yield* walk(walked.value as v.GenericSchema, entry, [...path, key])
      }
      return
    }
    case 'lazy': {
      yield* walk((walked.getter as (input: unknown) => v.GenericSchema)(value), value, path)
      return
    }
    case 'variant':
    case 'union': {
      const option = (walked.options ?? []).find((candidate) => v.is(candidate, value))
      if (option !== undefined) yield* walk(option, value, path)
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
      throw new InvariantError(`The reference walk has no rule for a ${walked.type} schema.`)
    }
  }
}
