import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { emulateColorScheme, resetColorScheme } from '../../testing/color-scheme'
import { mountShell } from '../../testing/mount-shell'

describe.each(['dark', 'light'] as const)('under the %s theme', (scheme) => {
  beforeEach(() => emulateColorScheme(scheme))
  afterEach(resetColorScheme)

  describe('the Outline canvas', () => {
    it('leaves the canvas landmark with no text', async () => {
      await mountShell({ path: '/design/corne/outline' })

      await expect.element(page.getByRole('main', { name: 'Canvas' })).toHaveTextContent('')
    })
  })
})
