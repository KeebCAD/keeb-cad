// Adapted from ninja-testing's scripts/hooks/guard.mjs.
// MIT License, Copyright (c) 2026 Illya Klymov.
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
// associated documentation files (the "Software"), to deal in the Software without restriction,
// including without limitation the rights to use, copy, modify, merge, publish, distribute,
// sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions: The above copyright notice and this
// permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
// NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
// OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
import type { GuardDecision, GuardRule, ToolHookInput } from './types.ts'

// `[^\n|;&]*` keeps a flag inside the one command it belongs to, so `pnpm test && git push -f`
// is caught by the push rule, not misread as a test flag.
const DENIED_COMMANDS: GuardRule[] = [
  {
    pattern: /\b(vitest|pnpm\s+test\S*)\b[^\n|;&]*\s(-u|--update)\b/,
    reason:
      'Updating snapshots is a person’s call after reading the diff. Show the diff and stop instead.',
  },
  {
    pattern: /\b(playwright|smoke|test:e2e)\b[^\n|;&]*\s--update-snapshots\b/,
    reason:
      'A person approves every screenshot baseline; an agent never updates one. Show the failing comparison instead.',
  },
  {
    pattern: /--no-verify\b/,
    reason: 'Bypassing hooks is forbidden. If a check is red, stop and report.',
  },
  {
    // Git options may sit before `push` (`git -C dir push`), and `-f` may join other short flags.
    pattern:
      /\bgit\b[^\n|;&]*?\bpush\b[^\n|;&]*\s(--force(-with-lease)?(=\S*)?|-[a-zA-Z]*f[a-zA-Z]*)(?=\s|$)/,
    reason: 'Force push is forbidden for the agent. Report and let a person decide.',
  },
  {
    pattern: /\brm\b[^\n|;&]*\.(spec|test)\.\w+/,
    reason: 'Deleting a test is not a fix. Report the failing test instead.',
  },
  {
    pattern: /\b(sed|perl)\b[^\n|;&]*\s-i\S*[^\n|;&]*ready-for-dev[^\n|;&]*-plan\.md\b/,
    reason:
      'Set a plan’s status with Edit, so the guard can check that its conformance review ran.',
  },
  {
    pattern: /\b(stryker|test:mutation)\b[^\n|;&]*\s--(break|thresholds)\b/,
    reason:
      'Mutation thresholds are not changed from the command line. Give each survivor a verdict instead.',
  },
  {
    pattern: hasPositionalStrykerConfig,
    reason:
      'A mutation run uses stryker.config.json; another config file would swap its thresholds. Give each survivor a verdict instead.',
  },
]

const DENIED_PATHS: GuardRule[] = [
  {
    pattern: /(^|\/)__(snapshots|screenshots)__\/|\.snap$|-snapshots\//,
    reason:
      'Snapshots and screenshot baselines are approved by a person, never edited by an agent. Show the diff instead.',
  },
]

const ASKED_PATHS: GuardRule[] = [
  {
    pattern:
      /(^|\/)((vitest|vite|playwright)(\.[\w-]+)?\.config\.[cm]?[jt]s|stryker[\w.-]*\.(json|[cm]?[jt]s))$/,
    reason:
      'This edits a runner or mutation config. If a failing test is the reason, the fix belongs in the test. Confirm this is infrastructure work.',
  },
]

const ASKED_TEXT: GuardRule[] = [
  {
    pattern: /Stryker\s+(disable|restore)/i,
    reason:
      'A `Stryker disable` comment excludes a mutant. Only an equivalent mutant may be excluded, and a person confirms it. A threshold, date or default from the requirement is a test gap, never an exclusion.',
  },
]

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit'])

const PLAN_FILE = /-plan\.md$/
const READY_STATUS = /^status:\s*['"]?ready-for-dev['"]?\s*$/m
const CONFORMANCE_LOG = /^## Conformance Log\s*$/m
const UNREVIEWED_PLAN: GuardDecision = {
  permissionDecision: 'deny',
  permissionDecisionReason:
    'A plan is approved only after its conformance review. Run the plan-conformance reviewer and write its ## Conformance Log first.',
}

// A heredoc body is data the command writes, not a command it runs.
const HEREDOC_BODY = /(<<-?\s*(['"]?)(\w+)\2)([^\n]*)\n[\s\S]*?\n[ \t]*\3[ \t]*(?=\n|$)/g

const STRYKER_RUN = /\b(stryker\s+run|test:mutation)\b([^\n|;&]*)/g
const CONFIG_FILE = /\.(json|[cm]?[jt]s)$/
// Options whose value may itself end in .ts or .json.
const FILE_VALUED_OPTIONS = new Set(['--mutate', '-m', '--incrementalFile'])

/**
 * Whether a tool call is denied, needs the person's confirmation, or (undefined) passes.
 * `currentText` is the edited file's text before the edit.
 */
export function guardDecision(
  { tool_name, tool_input = {} }: ToolHookInput,
  currentText = '',
): GuardDecision | undefined {
  if (tool_name === 'Bash') {
    const command = (tool_input.command ?? '').replaceAll(HEREDOC_BODY, '$1$4')
    return firstMatch(DENIED_COMMANDS, command, 'deny')
  }
  if (tool_name !== undefined && EDIT_TOOLS.has(tool_name)) {
    const path = tool_input.file_path ?? ''
    const newText = [
      tool_input.new_string,
      tool_input.content,
      ...(tool_input.edits ?? []).map((edit) => edit.new_string),
    ].join('\n')
    return (
      firstMatch(DENIED_PATHS, path, 'deny') ??
      (approvesUnreviewedPlan(path, newText, currentText) ? UNREVIEWED_PLAN : undefined) ??
      firstMatch(ASKED_PATHS, path, 'ask') ??
      firstMatch(ASKED_TEXT, newText, 'ask')
    )
  }
  return undefined
}

function firstMatch(
  rules: GuardRule[],
  text: string,
  permissionDecision: GuardDecision['permissionDecision'],
): GuardDecision | undefined {
  const rule = rules.find(({ pattern }) =>
    typeof pattern === 'function' ? pattern(text) : pattern.test(text),
  )
  return rule && { permissionDecision, permissionDecisionReason: rule.reason }
}

/** Whether an edit sets a plan to ready-for-dev while neither the plan nor the edit has its log. */
function approvesUnreviewedPlan(path: string, newText: string, currentText: string): boolean {
  return (
    PLAN_FILE.test(path) &&
    READY_STATUS.test(newText) &&
    !CONFORMANCE_LOG.test(`${currentText}\n${newText}`)
  )
}

/** Whether a Stryker run is handed a config file as a positional argument. */
function hasPositionalStrykerConfig(command: string): boolean {
  const runArguments = Array.from(command.matchAll(STRYKER_RUN), (match) => match[2] ?? '')
  return runArguments.some((rest) => {
    const tokens = rest.trim().split(/\s+/)
    return tokens.some(
      (token, index) =>
        !token.startsWith('-') &&
        CONFIG_FILE.test(token) &&
        !FILE_VALUED_OPTIONS.has(tokens[index - 1] ?? ''),
    )
  })
}
