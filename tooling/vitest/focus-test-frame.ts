/// <reference lib="dom" />
import { beforeEach } from 'vitest'

// Each test file runs in its own iframe, and Firefox gives an iframe focus only when something in
// it asks for focus. Once another file's frame has taken focus, `element.focus()` and Tab here land
// nowhere and `document.hasFocus()` stays false. A user's tab is focused; this makes the frame so.
// Per test, not once per file: a parallel file's frame can take focus between tests.
beforeEach(() => {
  window.focus()
})
