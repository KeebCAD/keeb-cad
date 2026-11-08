import { beforeEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { emulateColorScheme } from '../../testing/color-scheme'
import { mountShell } from '../../testing/mount-shell'

describe.each(['dark', 'light'] as const)('under the %s theme', (scheme) => {
  beforeEach(() => emulateColorScheme(scheme))
  describe('the Layout canvas', () => {
    it('shows the empty-design hint verbatim', async () => {
      await mountShell({ path: '/design/corne/layout' })

      await expect
        .element(page.getByRole('main', { name: 'Canvas' }))
        .toHaveTextContent('Add a group (G) or open the command palette (Ctrl+K).')
    })
  })
})
