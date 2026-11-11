import { Option } from '@keeb-cad/result'
import { beforeEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { emulateColorScheme } from '../testing/color-scheme'
import { mountShell } from '../testing/mount-shell'
import { press, pressKey } from '../testing/press'
import { Landmarks } from './landmarks'

const F6 = { key: 'F6', code: 'F6' }
const SHIFT_F6 = { key: 'F6', code: 'F6', shift: true }

const topBar = () => page.getByRole('banner', { name: 'Top bar' })
const slideOut = () => page.getByRole('complementary', { name: 'Tree' })
const canvas = () => page.getByRole('main', { name: 'Canvas' })
const inspector = () => page.getByRole('complementary', { name: 'Inspector' })
const statusStrip = () => page.getByRole('contentinfo', { name: 'Status strip' })
const treeButton = () => page.getByRole('button', { name: 'Tree' })

function arrange() {
  return mountShell({ path: '/design/corne/layout' })
}

async function openSlideOut() {
  press('T')
  await expect.element(slideOut()).toHaveFocus()
}

function blur(): void {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
}

function focusedLabel(): string | null {
  return document.activeElement?.getAttribute('aria-label') ?? null
}

describe.each(['dark', 'light'] as const)('under the %s theme', (scheme) => {
  beforeEach(() => emulateColorScheme(scheme))
  describe('F6 and Shift+F6', () => {
    it('cycle from outside every landmark through each, skipping the closed slide-out, and wrap to the top bar', async () => {
      await arrange()
      blur()

      const visited = Array.from({ length: 5 }, () => {
        pressKey(F6)
        return focusedLabel()
      })

      expect(visited).toEqual(['Top bar', 'Canvas', 'Inspector', 'Status strip', 'Top bar'])
    })

    it('land on the open slide-out from the top bar', async () => {
      await arrange()
      await openSlideOut()
      topBar().element().focus()

      pressKey(F6)

      await expect.element(slideOut()).toHaveFocus()
    })

    it('land on the empty inspector, then the status strip', async () => {
      await arrange()
      canvas().element().focus()

      pressKey(F6)
      await expect.element(inspector()).toHaveFocus()
      await expect.element(inspector()).toBeEmptyDOMElement()
      pressKey(F6)
      await expect.element(statusStrip()).toHaveFocus()
    })

    it('move from the PCB tab, inside the top bar, to the canvas', async () => {
      await arrange()
      page.getByRole('tab', { name: 'PCB' }).element().focus()

      pressKey(F6)

      await expect.element(canvas()).toHaveFocus()
    })

    it('wrap from the top bar back to the status strip on Shift+F6', async () => {
      await arrange()
      topBar().element().focus()

      pressKey(SHIFT_F6)

      await expect.element(statusStrip()).toHaveFocus()
    })

    it('go from outside every landmark to the status strip on Shift+F6', async () => {
      await arrange()
      blur()

      pressKey(SHIFT_F6)

      await expect.element(statusStrip()).toHaveFocus()
    })

    it('go back from the canvas to the open slide-out on Shift+F6', async () => {
      await arrange()
      await openSlideOut()
      canvas().element().focus()

      pressKey(SHIFT_F6)

      await expect.element(slideOut()).toHaveFocus()
    })

    it('go back from the canvas to the top bar on Shift+F6 while the slide-out is closed', async () => {
      await arrange()
      canvas().element().focus()

      pressKey(SHIFT_F6)

      await expect.element(topBar()).toHaveFocus()
    })

    describe('from the left rail', () => {
      it('move to the canvas while the slide-out is closed', async () => {
        await arrange()
        treeButton().element().focus()

        pressKey(F6)

        await expect.element(canvas()).toHaveFocus()
      })

      it('move to the open slide-out', async () => {
        await arrange()
        await openSlideOut()
        treeButton().element().focus()

        pressKey(F6)

        await expect.element(slideOut()).toHaveFocus()
      })

      it('go back to the top bar on Shift+F6', async () => {
        await arrange()
        treeButton().element().focus()

        pressKey(SHIFT_F6)

        await expect.element(topBar()).toHaveFocus()
      })
    })
  })
})

describe('focusedPlace', () => {
  it('names the canvas while focus is inside its root', async () => {
    const { injector } = await arrange()
    canvas().element().focus()

    expect(injector.resolve(Landmarks).focusedPlace()).toEqual(Option.some('canvas'))
  })

  it('names the slide-out while focus is inside its root', async () => {
    const { injector } = await arrange()
    await openSlideOut()

    expect(injector.resolve(Landmarks).focusedPlace()).toEqual(Option.some('slide-out'))
  })

  it('names no place while focus is on the body', async () => {
    const { injector } = await arrange()
    blur()

    expect(injector.resolve(Landmarks).focusedPlace()).toEqual(Option.none())
  })
})
