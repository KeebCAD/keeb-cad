import { execFileSync } from 'node:child_process'
import { statSync } from 'node:fs'
import path from 'node:path'

import type { ChangedFile } from './types.ts'

/** Each file `git status` reports changed or untracked in the project, with its mtime. */
export function readChangedFiles(projectDir: string): ChangedFile[] {
  const status = execFileSync('git', ['status', '--porcelain', '-uall'], {
    cwd: projectDir,
    encoding: 'utf8',
  })
  return status
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => line.slice(3).replace(/^.* -> /, ''))
    .flatMap((file) => {
      try {
        return [{ path: file, mtimeMs: statSync(path.join(projectDir, file)).mtimeMs }]
      } catch {
        // A deleted file has no mtime to compare.
        return []
      }
    })
}
