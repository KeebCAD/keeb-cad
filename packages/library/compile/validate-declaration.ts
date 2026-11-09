import { blueprintDeclarationSchema } from '@keeb-cad/schema'
import type { BlueprintDeclaration } from '@keeb-cad/schema'
import * as v from 'valibot'

export function validateDeclaration(file: string, declaration: unknown): BlueprintDeclaration {
  const parsed = v.safeParse(blueprintDeclarationSchema, declaration)
  if (parsed.success) return parsed.output
  const problems = parsed.issues.map(
    (issue) => `  ${v.getDotPath(issue) ?? '(root)'}: ${issue.message}`,
  )
  throw new Error(`${file}: invalid declaration\n${problems.join('\n')}`)
}
