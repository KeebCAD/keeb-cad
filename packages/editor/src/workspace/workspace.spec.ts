import { beforeEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { emulateColorScheme } from '../testing/color-scheme'
import { mountShell } from '../testing/mount-shell'
import { pressKey } from '../testing/press'
import { ShowLayout } from './layout/show-layout'

const AT_LAYOUT = '/design/corne/layout'

function digit(key: string) {
  return { key, code: `Digit${key}` }
}

describe.each(['dark', 'light'] as const)('under the %s theme', (scheme) => {
  beforeEach(() => emulateColorScheme(scheme))
  describe('the workspace tabs', () => {
    it.each([
      ['2', AT_LAYOUT, 'Outline', 'outline'],
      ['3', AT_LAYOUT, 'PCB', 'pcb'],
      ['4', AT_LAYOUT, 'Case', 'case'],
      ['5', AT_LAYOUT, 'Firmware', 'firmware'],
      ['1', '/design/corne/firmware', 'Layout', 'layout'],
    ])(
      'switch on key %s from %s to the %s tab, its URL segment and a worker focused on it',
      async (key, path, tab, workspace) => {
        const { lifecycle } = await mountShell({ path, recordFocus: true })

        pressKey(digit(key))

        await expect
          .element(page.getByRole('tab', { name: tab }))
          .toHaveAttribute('aria-selected', 'true')
        expect(location.hash).toBe(`#/design/corne/${workspace}`)
        expect(lifecycle.focused).toEqual([workspace])
      },
    )

    it("stay put on the open workspace's own key, which is unavailable there", async () => {
      const { lifecycle, invoke } = await mountShell({ path: AT_LAYOUT, recordFocus: true })

      pressKey(digit('1'))

      expect({
        available: invoke.available(ShowLayout),
        hash: location.hash,
        focused: lifecycle.focused,
      }).toEqual({ available: false, hash: `#${AT_LAYOUT}`, focused: [] })
    })

    it('switch on a clicked tab, putting it in the URL and focusing the worker on it', async () => {
      const { lifecycle } = await mountShell({ path: AT_LAYOUT, recordFocus: true })

      await page.getByRole('tab', { name: 'Case' }).click()

      await expect.poll(() => location.hash).toBe('#/design/corne/case')
      expect(lifecycle.focused).toEqual(['case'])
    })

    it.each([
      [0, 'Layout'],
      [1, 'Outline'],
      [2, 'PCB'],
      [3, 'Case'],
      [4, 'Firmware'],
    ])('put tab %i of the tab list as %s', async (index, name) => {
      await mountShell({ path: AT_LAYOUT })

      await expect
        .element(page.getByRole('tablist').getByRole('tab').nth(index))
        .toHaveAccessibleName(name)
    })

    it.each([
      ['Layout', '1'],
      ['Outline', '2'],
      ['PCB', '3'],
      ['Case', '4'],
      ['Firmware', '5'],
    ])("show the %s tab's key, %s, as its hint", async (name, hint) => {
      await mountShell({ path: AT_LAYOUT })

      await expect
        .element(page.getByRole('tab', { name }).getByText(hint, { exact: true }))
        .toBeVisible()
    })
  })
})
