import { guardDecision } from './guard-decision.ts'
import { readStdin } from './read-stdin.ts'
import type { ToolHookInput } from './types.ts'

const decision = guardDecision(readStdin<ToolHookInput>())
if (decision) {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', ...decision } }),
  )
}
