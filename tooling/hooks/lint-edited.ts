import { existsSync, readFileSync } from 'node:fs'
import { ESLint } from 'eslint'

import { lintDecision } from './lint-decision.ts'
import { readStdin } from './read-stdin.ts'
import type { ToolHookInput } from './types.ts'

const filePath = readStdin<ToolHookInput>().tool_input?.file_path
if (filePath !== undefined && existsSync(filePath)) {
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
  const eslint = new ESLint({ cache: false, cwd: projectDir })
  const text = readFileSync(filePath, 'utf8')
  const { exitCode, output } = await lintDecision(eslint, projectDir, filePath, text)
  process.stderr.write(output)
  process.exitCode = exitCode
}
