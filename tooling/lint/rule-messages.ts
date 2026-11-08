import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'

export async function lintResult(code: string, filePath: string): Promise<ESLint.LintResult> {
  const eslint = new ESLint({ cwd: fileURLToPath(new URL('../..', import.meta.url)) })
  const [result] = await eslint.lintText(code, { filePath })
  if (result === undefined) throw new Error(`ESLint returned no result for ${filePath}`)
  const fatal = result.messages.find((message) => message.fatal)
  if (fatal) throw new Error(`${filePath} did not parse: ${fatal.message}`)
  return result
}

export async function ruleMessages(
  ruleId: string,
  code: string,
  filePath: string,
): Promise<string[]> {
  const result = await lintResult(code, filePath)
  return result.messages
    .filter((message) => message.ruleId === ruleId)
    .map((message) => message.message)
}
