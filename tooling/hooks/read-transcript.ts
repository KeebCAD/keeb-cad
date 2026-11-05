import { readFileSync } from 'node:fs'

import type { TranscriptEntry } from './types.ts'

/** The transcript's entries, one per JSON line; a line that does not parse is skipped. */
export function readTranscript(transcriptPath: string | undefined): TranscriptEntry[] {
  return transcriptPath === undefined
    ? []
    : readFileSync(transcriptPath, 'utf8')
        .split('\n')
        .filter((line) => line.trim() !== '')
        .flatMap(parseEntry)
}

// The transcript is still being written, so its last line may be cut off.
function parseEntry(line: string): TranscriptEntry[] {
  try {
    return [JSON.parse(line) as TranscriptEntry]
  } catch {
    return []
  }
}
