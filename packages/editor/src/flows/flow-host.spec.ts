import { DesignStore, registerCommand } from '@keeb-cad/design'
import type { Module } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign, aMeta } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { mountShell } from '../testing/mount-shell'
import { TestRenameDesign } from '../testing/test-rename-design'
import { TestRenameFlow } from '../testing/test-rename-flow'
import { Flows } from './flows'
import { registerFlow } from './register-flow'

const AT_LAYOUT = '/design/corne/layout'
const ARRANGED_NAME = 'Corne'
const REQUIRED_TEXT = 'A name is required.'

const renameFlowModule: Module = {
  register(container) {
    registerCommand(container, TestRenameDesign)
    registerFlow(container, TestRenameFlow)
  },
}

const dialog = () => page.getByRole('dialog', { name: 'Rename design' })
const nameField = () => dialog().getByRole('textbox', { name: 'Name' })
const finishButton = () => dialog().getByRole('button', { name: 'Finish' })

async function arrange() {
  const shell = await mountShell({
    path: AT_LAYOUT,
    design: aDesign({ meta: aMeta({ name: ARRANGED_NAME }) }),
    modules: [renameFlowModule],
  })
  const store = shell.injector.resolve(DesignStore)
  return { flows: shell.injector.resolve(Flows), store, nameOf: () => nameOf(store) }
}

function nameOf(store: DesignStore): string | undefined {
  return store.current.map(({ design }) => design.meta.name).getOrUndefined()
}

describe('FlowHost', () => {
  it('shows no dialog with no flow open', async () => {
    await arrange()

    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
  })

  it("shows the second start's own draft in one dialog and finishes with it", async () => {
    const { flows, nameOf } = await arrange()
    flows.start(TestRenameFlow, { name: 'Kyria' })
    await expect.element(nameField()).toHaveValue('Kyria')

    flows.start(TestRenameFlow, { name: 'Lily58' })

    await expect.element(nameField()).toHaveValue('Lily58')
    expect(page.getByRole('dialog').all()).toHaveLength(1)
    await finishButton().click()
    await expect.element(dialog()).not.toBeInTheDocument()
    expect(nameOf()).toBe('Lily58')
  })

  it('closes the dialog when the design is replaced', async () => {
    const { flows, store } = await arrange()
    flows.start(TestRenameFlow, { name: 'Kyria' })
    await expect.element(dialog()).toBeVisible()

    expectOk(
      store.replaceDesign({ design: aDesign({ meta: aMeta({ name: 'Lily58' }) }), unreadable: [] }),
    )

    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
  })

  it('disables Finish and shows the reason once the field is emptied', async () => {
    const { flows } = await arrange()
    flows.start(TestRenameFlow, { name: 'Kyria' })
    await expect.element(finishButton()).not.toHaveAttribute('aria-disabled')

    await nameField().fill('')

    await expect.element(finishButton()).toHaveAttribute('aria-disabled', 'true')
    await expect.element(dialog().getByText(REQUIRED_TEXT)).toBeVisible()
  })

  it('disables Finish when a commit from outside makes the draft refused', async () => {
    const { flows, store } = await arrange()
    flows.start(TestRenameFlow, { name: 'Kyria' })
    await expect.element(finishButton()).not.toHaveAttribute('aria-disabled')

    expectOk(store.run(TestRenameDesign, { name: 'Kyria' }))

    await expect.element(finishButton()).toHaveAttribute('aria-disabled', 'true')
  })

  it('cancels the flow on Esc, running nothing', async () => {
    const { flows, nameOf } = await arrange()
    flows.start(TestRenameFlow, { name: 'Kyria' })
    await expect.element(nameField()).toHaveFocus()

    await userEvent.keyboard('{Escape}')

    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
    expect({ stack: flows.stack, name: nameOf() }).toEqual({ stack: [], name: ARRANGED_NAME })
  })
})
