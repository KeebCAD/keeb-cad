import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'

const eslint = new ESLint({ cwd: fileURLToPath(new URL('../..', import.meta.url)) })

/** The result of linting `code` at `filePath` under the real config; throws if it did not parse. */
export async function lintResult(code: string, filePath: string): Promise<ESLint.LintResult> {
  const [result] = await eslint.lintText(code, { filePath })
  if (result === undefined) throw new Error(`ESLint returned no result for ${filePath}`)
  const fatal = result.messages.find((message) => message.fatal)
  if (fatal) throw new Error(`${filePath} did not parse: ${fatal.message}`)
  return result
}

/** The messages `ruleId` reports under the real config for `code` at `filePath`. */
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
