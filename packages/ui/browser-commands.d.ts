import 'vitest/browser'

declare module 'vitest/browser' {
  interface BrowserCommands {
    setColorScheme: (scheme: 'light' | 'dark' | null) => Promise<void>
  }
}
