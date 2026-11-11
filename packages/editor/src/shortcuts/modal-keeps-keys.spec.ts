import { UiDialog } from '@keeb-cad/ui'
import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'

import { mountShell } from '../testing/mount-shell'
import { press, pressKey } from '../testing/press'

const AT_LAYOUT = '/design/corne/layout'
const TITLE = 'Add group'
const BUTTON = 'Add'
const expectedScrim = 'rgba(35, 38, 52, 0.45)'

const dialog = () => page.getByRole('dialog', { name: TITLE })
const dialogButton = () => dialog().getByRole('button', { name: BUTTON })
const slideOut = () => page.getByRole('complementary', { name: 'Tree', includeHidden: true })

async function openDialog() {
  const open = shallowRef(true)
  await render({
    render: () =>
      h(
        UiDialog,
        {
          open: open.value,
          'onUpdate:open': (value: boolean) => {
            open.value = value
          },
        },
        {
          title: () => TITLE,
          default: () => h('button', { type: 'button' }, BUTTON),
        },
      ),
  })
  await expect.element(dialogButton()).toHaveFocus()
  return { close: () => (open.value = false) }
}

function appRoot() {
  const root = document.getElementById('app')
  if (root === null) throw new Error('The shell mounted no #app.')
  return page.elementLocator(root)
}

describe('an open modal', () => {
  it('takes Esc for itself, leaving the slide-out open behind it', async () => {
    await mountShell({ path: AT_LAYOUT })
    press('T')
    await expect.element(slideOut()).toBeVisible()
    await openDialog()
    await expect.element(appRoot()).toHaveAttribute('aria-hidden', 'true')

    await userEvent.keyboard('{Escape}')

    await expect.element(dialog()).not.toBeInTheDocument()
    await expect.element(slideOut()).toBeVisible()
  })

  it('lays its scrim over the open slide-out', async () => {
    await mountShell({ path: AT_LAYOUT })
    press('T')
    await expect.element(slideOut()).toBeVisible()
    const slideOutElement = slideOut().element()
    await openDialog()

    const box = slideOutElement.getBoundingClientRect()
    // The modal turns pointer events off on body, which hit testing skips whatever paints on top;
    // turned back on, the point lands on what is painted there.
    const bodyPointerEvents = document.body.style.pointerEvents
    document.body.style.pointerEvents = 'auto'
    const element = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    document.body.style.pointerEvents = bodyPointerEvents

    expect({
      inSlideOut: element !== null && slideOutElement.contains(element),
      background: element === null ? null : getComputedStyle(element).backgroundColor,
    }).toEqual({ inSlideOut: false, background: expectedScrim })
  })

  it('keeps a workspace digit, F6 and a Ctrl chord from the editor behind it', async () => {
    await mountShell({ path: AT_LAYOUT })
    await openDialog()

    const keydowns = [
      pressKey({ key: '2', code: 'Digit2' }),
      pressKey({ key: 'F6', code: 'F6' }),
      pressKey({ key: 'd', code: 'KeyD', ctrl: true }),
    ]

    await expect.element(dialogButton()).toHaveFocus()
    expect({
      hash: location.hash,
      prevented: keydowns.map((keydown) => keydown.defaultPrevented),
    }).toEqual({ hash: `#${AT_LAYOUT}`, prevented: [false, false, false] })
  })

  it('keeps T from opening the slide-out behind it', async () => {
    await mountShell({ path: AT_LAYOUT })
    await openDialog()

    const keydown = pressKey({ key: 't', code: 'KeyT' })
    await nextTick()

    expect({ prevented: keydown.defaultPrevented, slideOut: slideOut().query() }).toEqual({
      prevented: false,
      slideOut: null,
    })
  })

  it('hands the keys back once it has closed', async () => {
    await mountShell({ path: AT_LAYOUT })
    const { close } = await openDialog()
    close()
    await expect.element(dialog()).not.toBeInTheDocument()

    pressKey({ key: '2', code: 'Digit2' })

    await expect
      .element(page.getByRole('tab', { name: 'Outline' }))
      .toHaveAttribute('aria-selected', 'true')
  })
})
