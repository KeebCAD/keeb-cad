// Adapted from ninja-testing's scripts/hooks/stop-check.mjs.
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
import path from 'node:path'

import type { ChangedFile, StopDecision, TranscriptEntry, TranscriptToolUse } from './types.ts'

const LOGIC_FILE = /^(packages|app|reference-designs|tooling)\/.+\.(ts|mts|cts|tsx|js|mjs|cjs|vue)$/
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit'])
// A run counts only unscoped: `pnpm test <file>` or `--project x` proves the files it ran.
const FULL_RUN = /^(mise exec -- )?pnpm (run )?(test|check)$/
const SEGMENT_SEPARATOR = /\n|&&|\|\||;|\|/
const REDIRECT = /\s*\d*>>?\s*&?\S+/g
// A subshell's parentheses stay on its first and last segment after the split. One pair only:
// `((…))` is arithmetic, not a subshell.
const SUBSHELL = /^\(|\)$/g

/**
 * Blocks the stop when a spec or source file under packages/, app/, reference-designs/ or tooling/ changed
 * with no full `pnpm test` after it: an Edit, Write or MultiEdit after the last full run in the
 * transcript, or a file `git status` reports changed later than that run (any such file when no
 * full run happened), which catches files written through Bash. A stop that a block already
 * continued passes, so the hook asks once per prompt.
 */
export function stopDecision(
  entries: TranscriptEntry[],
  projectDir: string,
  stopHookActive: boolean,
  changedFiles: ChangedFile[],
): StopDecision {
  if (stopHookActive) return undefined
  const changedSinceRun = new Set<string>()
  let lastRunAt = -Infinity
  for (const { use, timestamp = '' } of toolUses(entries)) {
    if (use.name === 'Bash' && isFullRun(use.input?.command ?? '')) {
      changedSinceRun.clear()
      lastRunAt = Date.parse(timestamp)
    }
    if (use.name !== undefined && EDIT_TOOLS.has(use.name)) {
      const path = projectPath(use.input?.file_path ?? '', projectDir)
      if (LOGIC_FILE.test(path)) changedSinceRun.add(path)
    }
  }
  for (const file of changedFiles) {
    // A run without a readable timestamp proves nothing about when the files changed.
    if (LOGIC_FILE.test(file.path) && !(file.mtimeMs <= lastRunAt)) changedSinceRun.add(file.path)
  }
  if (changedSinceRun.size === 0) return undefined
  return {
    decision: 'block',
    reason: `Run the whole suite with \`pnpm test\` before finishing: ${[...changedSinceRun].join(', ')} changed after the last full run. A green run of the touched files is not verification.`,
  }
}

function toolUses(
  entries: TranscriptEntry[],
): { use: TranscriptToolUse; timestamp: string | undefined }[] {
  return entries.flatMap((entry) => {
    const content = entry.type === 'assistant' ? entry.message?.content : undefined
    return Array.isArray(content)
      ? content.filter(isToolUse).map((use) => ({ use, timestamp: entry.timestamp }))
      : []
  })
}

function isToolUse(item: unknown): item is TranscriptToolUse {
  return typeof item === 'object' && item !== null && 'type' in item && item.type === 'tool_use'
}

function isFullRun(command: string): boolean {
  return command
    .split(SEGMENT_SEPARATOR)
    .some((segment) =>
      FULL_RUN.test(segment.replaceAll(REDIRECT, '').trim().replaceAll(SUBSHELL, '').trim()),
    )
}

/** The path relative to the project, or '' when it lies outside it. */
function projectPath(filePath: string, projectDir: string): string {
  if (!path.isAbsolute(filePath)) return filePath
  const relative = path.relative(projectDir, filePath)
  return relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
    ? ''
    : relative
}
