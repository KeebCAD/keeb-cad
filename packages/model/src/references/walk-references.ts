import { designSchema, type Design, type Frozen, type Node, nodeSchema } from '@keeb-cad/schema'
import type * as v from 'valibot'

import { expressionNames } from './expression-names'
import type { Reference } from './types'
import { walkSchema } from './walk-schema'

// Every declared reference in the design, and one `parameter` reference per name an expression
// uses, each at its value's path.
export function walkReferences(design: Frozen<Design>): Generator<Reference> {
  return references(designSchema, design)
}

// The same walk over one layout node, paths starting at that node.
export function walkNodeReferences(node: Frozen<Node>): Generator<Reference> {
  return references(nodeSchema, node)
}

function* references(schema: v.GenericSchema, value: unknown): Generator<Reference> {
  for (const { path, metadata, value: found } of walkSchema(schema, value)) {
    if (metadata.refKind !== undefined) {
      yield { path, kind: metadata.refKind, target: found as string }
    } else if (metadata.expression === true) {
      for (const name of expressionNames(found as string)) {
        yield { path, kind: 'parameter', target: name }
      }
    }
  }
}
