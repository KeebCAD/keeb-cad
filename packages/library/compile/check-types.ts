import ts from 'typescript'

const OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2023,
  lib: ['lib.es2023.d.ts'],
  module: ts.ModuleKind.Preserve,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  noUncheckedIndexedAccess: true,
  skipLibCheck: true,
  types: [],
  noEmit: true,
}

export function checkTypes(file: string): void {
  const program = ts.createProgram([file], OPTIONS)
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length === 0) return
  const host: ts.FormatDiagnosticsHost = {
    getCurrentDirectory: () => process.cwd(),
    getCanonicalFileName: (name) => name,
    getNewLine: () => '\n',
  }
  throw new Error(`${file}: type check failed\n${ts.formatDiagnostics(diagnostics, host)}`)
}
