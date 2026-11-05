import { ruleMessages } from './rule-messages'

/** The `no-restricted-syntax` messages the real config reports for `code` at `filePath`. */
export const restrictedSyntax = (code: string, filePath: string): Promise<string[]> =>
  ruleMessages('no-restricted-syntax', code, filePath)
