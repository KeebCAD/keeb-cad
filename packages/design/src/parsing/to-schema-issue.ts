import type { SchemaIssue } from '@keeb-cad/schema'
import type * as v from 'valibot'

export function toSchemaIssue(issue: v.BaseIssue<unknown>): SchemaIssue {
  return {
    path: (issue.path ?? []).map((item) =>
      typeof item.key === 'number' ? item.key : String(item.key),
    ),
    message: issue.message,
  }
}
