import type { SchemaIssue } from '@keeb-cad/schema'

export function formatIssuePaths(issues: readonly SchemaIssue[]): string {
  return issues
    .map((issue) => issue.path.join('.'))
    .toSorted((a, b) => Number(a > b) - Number(a < b))
    .join(', ')
}
