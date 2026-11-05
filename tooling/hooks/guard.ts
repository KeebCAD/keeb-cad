import { guardDecision } from './guard-decision.ts'
import { readStdin } from './read-stdin.ts'
import { readTextIfExists } from './read-text-if-exists.ts'
import type { ToolHookInput } from './types.ts'

const input = readStdin<ToolHookInput>()
const decision = guardDecision(input, readTextIfExists(input.tool_input?.file_path))
if (decision) {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', ...decision } }),
  )
}
