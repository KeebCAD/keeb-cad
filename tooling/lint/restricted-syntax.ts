import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'

const eslint = new ESLint({ cwd: fileURLToPath(new URL('../..', import.meta.url)) })

/** The `no-restricted-syntax` messages the real config reports for `code` at `filePath`. */
export async function restrictedSyntax(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath })
  if (result === undefined) throw new Error(`ESLint returned no result for ${filePath}`)
  const fatal = result.messages.find((message) => message.fatal)
  if (fatal) throw new Error(`${filePath} did not parse: ${fatal.message}`)
  return result.messages
    .filter((message) => message.ruleId === 'no-restricted-syntax')
    .map((message) => message.message)
}
