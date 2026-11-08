import { aDesign, aMeta, anId } from '@keeb-cad/schema/testing'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { emulateColorScheme, resetColorScheme } from '../testing/color-scheme'
import { mountShell } from '../testing/mount-shell'

afterEach(resetColorScheme)

function box(element: Element) {
  const { width, height } = element.getBoundingClientRect()
  return { width, height }
}

function background(element: Element): string {
  return getComputedStyle(element).backgroundColor
}

describe('the editor shell', () => {
  describe.each(['dark', 'light'] as const)('under the %s theme', (scheme) => {
    beforeEach(() => emulateColorScheme(scheme))

    it("heads the top bar with the open design's name", async () => {
      await mountShell({
        path: '/design/corne/layout',
        design: aDesign({ meta: aMeta({ id: anId('corne'), name: 'Corne' }) }),
      })

      await expect
        .element(page.getByRole('banner', { name: 'Top bar' }).getByRole('heading', { level: 1 }))
        .toHaveTextContent('Corne')
    })

    it.each([
      ['banner', 'Top bar'],
      ['main', 'Canvas'],
      ['complementary', 'Inspector'],
      ['contentinfo', 'Status strip'],
    ] as const)('labels its %s landmark %s, focusable only by script', async (role, name) => {
      await mountShell({ path: '/design/corne/layout' })

      await expect.element(page.getByRole(role, { name })).toHaveAttribute('tabindex', '-1')
    })
  })

  it.each([
    ['dark', 'rgb(41, 44, 60)', 'rgb(48, 52, 70)'],
    ['light', 'rgb(230, 233, 239)', 'rgb(239, 241, 245)'],
  ] as const)(
    'at 1366x768 under the %s theme sizes and colours each box from the tokens',
    async (scheme, chrome, panel) => {
      await emulateColorScheme(scheme)
      await mountShell({ path: '/design/corne/layout' })
      const topBar = page.getByRole('banner', { name: 'Top bar' }).element()
      const rail = page.getByRole('group', { name: 'Left rail' }).element()
      const inspector = page.getByRole('complementary', { name: 'Inspector' }).element()
      const strip = page.getByRole('contentinfo', { name: 'Status strip' }).element()
      const canvas = page.getByRole('main', { name: 'Canvas' }).element()

      expect({
        topBar: { height: box(topBar).height, background: background(topBar) },
        rail: { width: box(rail).width, background: background(rail) },
        inspector: { width: box(inspector).width, background: background(inspector) },
        strip: { height: box(strip).height, background: background(strip) },
        canvas: box(canvas),
      }).toEqual({
        topBar: { height: 42, background: chrome },
        rail: { width: 44, background: chrome },
        inspector: { width: 320, background: panel },
        strip: { height: 30, background: chrome },
        canvas: { width: 1002, height: 696 },
      })
    },
  )
})
