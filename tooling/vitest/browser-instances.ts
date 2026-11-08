import { fileURLToPath } from 'node:url'
import type { BrowserInstanceOption } from 'vitest/node'

const focusTestFrame = fileURLToPath(new URL('focus-test-frame.ts', import.meta.url))

export const browserInstances: BrowserInstanceOption[] = [
  { browser: 'chromium' },
  { browser: 'firefox', setupFiles: [focusTestFrame] },
]
