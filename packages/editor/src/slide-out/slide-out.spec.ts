import { aDesign, aLayout, anId, aSlot } from '@keeb-cad/schema/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Selection } from '../selection/selection'

import { emulateColorScheme } from '../testing/color-scheme'
import { mountShell } from '../testing/mount-shell'
import { press, pressKey } from '../testing/press'
import { CloseSlideOut } from './close-slide-out'
import { OpenTree } from './open-tree'

const ESCAPE = { key: 'Escape', code: 'Escape' }

const slideOut = () => page.getByRole('complementary', { name: 'Tree' })
const treeButton = () => page.getByRole('button', { name: 'Tree' })

function arrange() {
  return mountShell({ path: '/design/corne/layout' })
}

function blur(): void {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
}

describe.each(['dark', 'light'] as const)('under the %s theme', (scheme) => {
  beforeEach(() => emulateColorScheme(scheme))
  describe('the Tree slide-out', () => {
    it('opens on T holding no text, closes on Esc, and stays closed on a second Esc', async () => {
      await arrange()

      press('T')
      await expect.element(slideOut()).toBeVisible()
      await expect.element(slideOut()).toHaveTextContent('')
      pressKey(ESCAPE)
      await expect.element(slideOut()).not.toBeInTheDocument()
      pressKey(ESCAPE)
      await expect.element(slideOut()).not.toBeInTheDocument()
    })

    it('takes focus on its root as it opens', async () => {
      await arrange()

      press('T')

      await expect.element(slideOut()).toHaveFocus()
    })

    it('leaves Esc unavailable while closed', async () => {
      const { invoke } = await arrange()

      expect(invoke.available(CloseSlideOut)).toBe(false)
    })

    it('stays open on T while open, which is unavailable then', async () => {
      const { invoke } = await arrange()
      press('T')
      await expect.element(slideOut()).toBeVisible()

      press('T')

      expect(invoke.available(OpenTree)).toBe(false)
      await expect.element(slideOut()).toBeVisible()
    })

    it('opens and closes from the rail button, which says whether it is expanded', async () => {
      await arrange()

      await treeButton().click()
      await expect.element(slideOut()).toBeVisible()
      await expect.element(treeButton()).toHaveAttribute('aria-expanded', 'true')
      await treeButton().click()
      await expect.element(slideOut()).not.toBeInTheDocument()
      await expect.element(treeButton()).toHaveAttribute('aria-expanded', 'false')
    })

    it('returns focus on close to the element that had it on open', async () => {
      await arrange()
      const layoutTab = page.getByRole('tab', { name: 'Layout' })
      layoutTab.element().focus()
      press('T')
      await expect.element(slideOut()).toHaveFocus()

      pressKey(ESCAPE)

      await expect.element(layoutTab).toHaveFocus()
    })

    it('leaves focus on close where the user moved it out of the slide-out', async () => {
      await arrange()
      page.getByRole('tab', { name: 'Layout' }).element().focus()
      press('T')
      await expect.element(slideOut()).toHaveFocus()
      const canvas = page.getByRole('main', { name: 'Canvas' })
      canvas.element().focus()

      pressKey(ESCAPE)

      await expect.element(slideOut()).not.toBeInTheDocument()
      await expect.element(canvas).toHaveFocus()
    })

    it('returns focus on close to the canvas when nothing had it on open', async () => {
      await arrange()
      blur()
      press('T')
      await expect.element(slideOut()).toHaveFocus()

      pressKey(ESCAPE)

      await expect.element(page.getByRole('main', { name: 'Canvas' })).toHaveFocus()
    })

    it.each([
      ['the selected row', ['b'], 'b'],
      ['the first row with nothing selected', [], 'a'],
    ])('takes focus on %s as it opens', async (_role, selected, expected) => {
      const design = aDesign({
        layout: aLayout({ children: [aSlot({ id: anId('a') }), aSlot({ id: anId('b') })] }),
      })
      const { injector } = await mountShell({ path: '/design/corne/layout', design })
      injector.resolve(Selection).select(selected.map((id) => anId(id)))

      press('T')

      await expect
        .element(page.getByRole('treeitem', { name: expected, exact: true }))
        .toHaveFocus()
    })
  })
})
