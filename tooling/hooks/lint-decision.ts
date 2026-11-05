import path from 'node:path'
import type { ESLint } from 'eslint'

import type { LintOutcome } from './types.ts'

const PASS: LintOutcome = { exitCode: 0, output: '' }

/**
 * Lints an edited file's text through the workspace config. Errors return exit code 2 with
 * ESLint's formatted output, so Claude Code feeds them back to the agent; a file outside the
 * project, an ignored file or a clean one passes with no output.
 */
export async function lintDecision(
  eslint: ESLint,
  projectDir: string,
  filePath: string,
  text: string,
): Promise<LintOutcome> {
  const absolute = path.resolve(projectDir, filePath)
  const relative = path.relative(projectDir, absolute)
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return PASS
  }
  if (await eslint.isPathIgnored(absolute)) return PASS
  const results = await eslint.lintText(text, { filePath: absolute })
  if (results.every((result) => result.errorCount === 0)) return PASS
  const formatter = await eslint.loadFormatter('stylish')
  return { exitCode: 2, output: await formatter.format(results) }
}
