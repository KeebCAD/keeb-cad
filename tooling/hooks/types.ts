export type ToolInput = {
  command?: string
  file_path?: string
  new_string?: string
  content?: string
  edits?: { new_string?: string }[]
}

export type ToolHookInput = {
  tool_name?: string
  tool_input?: ToolInput
}

export type GuardDecision = {
  permissionDecision: 'deny' | 'ask'
  permissionDecisionReason: string
}

export type GuardRule = {
  pattern: RegExp | ((text: string) => boolean)
  reason: string
}

export type TranscriptToolUse = {
  type: 'tool_use'
  name?: string
  input?: ToolInput
}

export type TranscriptEntry = {
  type?: string
  timestamp?: string
  message?: { content?: unknown }
}

export type StopInput = {
  stop_hook_active?: boolean
  background_tasks?: readonly unknown[]
  transcript_path?: string
  cwd?: string
}

export type ChangedFile = {
  path: string
  mtimeMs: number
}

export type StopDecision =
  { hookSpecificOutput: { hookEventName: 'Stop'; additionalContext: string } } | undefined

export type LintOutcome = {
  exitCode: 0 | 2
  output: string
}
