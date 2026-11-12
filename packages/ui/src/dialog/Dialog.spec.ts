import { describe, expect, it, onTestFinished } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'

import DialogHost from '../../workbench/DialogHost.vue'
import { dialogStates } from '../../workbench/states/dialog-states'
import '../theme/theme.css'
import UiDialog from './UiDialog.vue'

const TITLE = 'Add group'
const CONTENT = 'The id field goes here.'
const expectedScrim = 'rgba(35, 38, 52, 0.45)'

const slots = { title: () => TITLE, default: () => h('p', CONTENT) }

function arrange(open: boolean) {
  return render(UiDialog, { props: { open }, slots })
}

async function arrangeHeld() {
  const open = shallowRef(true)
  const screen = await render({
    render: () =>
      h(
        UiDialog,
        {
          open: open.value,
          onDismiss: () => {
            open.value = false
          },
        },
        slots,
      ),
  })
  return { screen, open }
}

function elementAt(x: number, y: number): Element {
  const element = document.elementFromPoint(x, y)
  if (element === null) throw new Error(`Nothing lies at (${String(x)}, ${String(y)}).`)
  return element
}

function aBodyChild(): HTMLElement {
  const child = document.createElement('div')
  document.body.append(child)
  onTestFinished(() => child.remove())
  return child
}

describe('Dialog', () => {
  it.each(dialogStates)(
    'opens the $name state as a dialog named by its title, holding its content',
    async (state) => {
      const screen = await render(DialogHost, { props: state.props, slots: state.slots })

      await screen.getByRole('button', { name: 'Open dialog' }).click()

      const dialog = page.getByRole('dialog', { name: 'Add group in root' })
      await expect.element(dialog).toBeVisible()
      await expect.element(dialog.getByText(CONTENT)).toBeVisible()
    },
  )

  it('portals its content out of the rendered component', async () => {
    const screen = await arrange(true)

    const dialog = page.getByRole('dialog', { name: TITLE })
    await expect.element(dialog).toBeVisible()
    expect(screen.container.contains(dialog.element())).toBe(false)
  })

  it('hides the rest of the page while open and shows it again once closed', async () => {
    const child = aBodyChild()
    await arrangeHeld()
    await expect.element(page.getByRole('dialog', { name: TITLE })).toBeVisible()
    await expect.element(page.elementLocator(child)).toHaveAttribute('aria-hidden', 'true')

    await userEvent.keyboard('{Escape}')

    await expect.element(page.getByRole('dialog', { name: TITLE })).not.toBeInTheDocument()
    await expect.element(page.elementLocator(child)).not.toHaveAttribute('aria-hidden')
  })

  it('reports a dismiss once on Esc, and no change of open', async () => {
    const screen = await arrange(true)
    await expect.element(page.getByRole('dialog', { name: TITLE })).toBeVisible()

    await userEvent.keyboard('{Escape}')

    expect({
      dismiss: screen.emitted('dismiss'),
      updateOpen: screen.emitted('update:open'),
    }).toEqual({ dismiss: [[]], updateOpen: undefined })
  })

  it('reports a dismiss once on a press on the scrim in the top left corner', async () => {
    const screen = await arrange(true)
    await expect.element(page.getByRole('dialog', { name: TITLE })).toBeVisible()

    await userEvent.click(elementAt(0, 0), { position: { x: 0, y: 0 } })

    expect(screen.emitted('dismiss')).toEqual([[]])
  })

  it('shows no dialog while closed', async () => {
    await arrange(false)

    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
  })

  it('lays its scrim over both corners of the page', async () => {
    const screen = await arrange(true)
    const dialog = page.getByRole('dialog', { name: TITLE })
    await expect.element(dialog).toBeVisible()

    const corners = [
      [0, 0],
      [innerWidth - 1, innerHeight - 1],
    ].map(([x = 0, y = 0]) => {
      const element = document.elementFromPoint(x, y)
      return {
        inRender: element !== null && screen.container.contains(element),
        inDialog: element !== null && dialog.element().contains(element),
        background: element === null ? null : getComputedStyle(element).backgroundColor,
      }
    })

    const expectedCorner = { inRender: false, inDialog: false, background: expectedScrim }
    expect(corners).toEqual([expectedCorner, expectedCorner])
  })
})
