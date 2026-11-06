import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { effectScope, nextTick } from 'vue'

import { THEME_STORAGE_KEY } from './theme-storage-key'
import { useThemeChoice } from './use-theme-choice'

afterEach(async () => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  vi.restoreAllMocks()
  await commands.setColorScheme(null)
})

async function arrange({ os, stored }: { os: 'dark' | 'light'; stored?: string }) {
  await commands.setColorScheme(os)
  // The emulated scheme reaches the test frame's media queries a moment later.
  await expect.poll(() => matchMedia('(prefers-color-scheme: dark)').matches).toBe(os === 'dark')
  if (stored !== undefined) localStorage.setItem(THEME_STORAGE_KEY, stored)
  const scope = effectScope()
  onTestFinished(() => scope.stop())
  const choice = scope.run(() => useThemeChoice())
  if (choice === undefined) throw new Error('The scope ran nothing.')
  await nextTick()
  return choice
}

const appliedTheme = () => document.documentElement.dataset.theme

describe('useThemeChoice', () => {
  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
    ['auto', 'dark'],
    ['bogus', 'dark'],
    [undefined, 'dark'],
  ])('with the OS dark and %s stored, applies %s', async (stored, expected) => {
    await arrange({ os: 'dark', stored })

    expect(appliedTheme()).toBe(expected)
  })

  it('with the OS light and nothing stored, applies light', async () => {
    await arrange({ os: 'light' })

    expect(appliedTheme()).toBe('light')
  })

  it('stores a chosen mode and applies it, then follows the OS again on auto', async () => {
    const choice = await arrange({ os: 'dark' })

    choice.value = 'light'
    await nextTick()
    const afterLight = { stored: localStorage.getItem(THEME_STORAGE_KEY), applied: appliedTheme() }
    choice.value = 'auto'
    await nextTick()
    const afterAuto = { stored: localStorage.getItem(THEME_STORAGE_KEY), applied: appliedTheme() }

    expect([afterLight, afterAuto]).toEqual([
      { stored: 'light', applied: 'light' },
      { stored: 'auto', applied: 'dark' },
    ])
  })

  it('stays auto on the OS theme when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    const choice = await arrange({ os: 'dark' })

    expect({ choice: choice.value, applied: appliedTheme() }).toEqual({
      choice: 'auto',
      applied: 'dark',
    })
  })
})
