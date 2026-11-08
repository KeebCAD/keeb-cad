import { readChangedFiles } from './read-changed-files.ts'
import { readStdin } from './read-stdin.ts'
import { readTranscript } from './read-transcript.ts'
import { stopDecision } from './stop-decision.ts'
import type { StopInput } from './types.ts'

const input = readStdin<StopInput>()
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd()
const decision = stopDecision(
  readTranscript(input.transcript_path),
  projectDir,
  input.stop_hook_active ?? false,
  readChangedFiles(projectDir),
  input.background_tasks,
)
if (decision) process.stdout.write(JSON.stringify(decision))
