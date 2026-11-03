import { Result } from '@keeb-cad/result'
import type { SchemaIssue } from '@keeb-cad/schema'
import * as v from 'valibot'

import { toSchemaIssue } from './to-schema-issue'

export function parse<S extends v.GenericSchema>(
  schema: S,
  value: unknown,
): Result<v.InferOutput<S>, SchemaIssue[]> {
  const parsed = v.safeParse(schema, value)
  return parsed.success
    ? Result.ok(parsed.output)
    : Result.err(parsed.issues.map((issue) => toSchemaIssue(issue)))
}
