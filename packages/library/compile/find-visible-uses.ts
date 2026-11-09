import ts from 'typescript'

/** The ids named by `use('…', …)` calls a reader can see; a computed id is the run's own check. */
export function findVisibleUses(sourceText: string): string[] {
  const source = ts.createSourceFile('source.ts', sourceText, ts.ScriptTarget.ES2023, true)
  const ids = new Set<string>()
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'use'
    ) {
      const [first] = node.arguments
      if (first !== undefined && ts.isStringLiteralLike(first)) ids.add(first.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return [...ids]
}
