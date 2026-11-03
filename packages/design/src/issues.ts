import type * as v from 'valibot'

import type { SchemaIssue } from '@keeb-cad/schema'

/** Plain copies of Valibot's issues: each path as object keys and array indexes. */
export function toSchemaIssues(issues: readonly v.BaseIssue<unknown>[]): SchemaIssue[] {
  return issues.map((issue) => ({
    path: (issue.path ?? []).map(({ key }) =>
      typeof key === 'string' || typeof key === 'number' ? key : String(key),
    ),
    message: issue.message,
  }))
}
